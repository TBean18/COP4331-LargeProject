// Set up routes for all group related end points.
const express = require("express");
const router = express.Router();
const jwt = require("../../util/jwt");

const group = require("../../models/group");
const user = require("../../models/user");
const { model } = require("../../models/chore");
const chore = model;
// Route        GET api/chores/
// Description  Get the Chore list for the given user
// Access       Private
// Description  Endpoint used ot return the chore list for a given user
//              Meaning, return an array of all chores for which the current user is the assigned group member
router.get("/user_chores/:user_ID", (req, res) => {
  //TODO | Write this
  const user_ID = req.params.user_ID;
  //Each user has an array of groups
  try {
    user.getChoreList(user_ID, (err, ret) => {
      if (err) return res.status(404).json({
        error: err
      });
      return res.json({
        chores: ret
      });
    });
  } catch (err) {
    res.status(404).json({
      error: err
    });
  }
  //
  // group.getGroupMemberArrayFromUser(user_ID);
  // chore.getUserChoreList(user_ID);
});

// Route        GET api/chores/:group_ID
// Description  Get the Chore list for a given group
// Access       Public
// Parameters
//      group_id:   String - ID of group for which to return chore list
router.get("/:group_ID", (req, res) => {
  //Do we need to verify the user on a chorelist lookup?

  // Retrieve all chore objects from the given group_ID
  group
    .findById(req.params.group_ID)
    .then((foundGroup) => {
      //Return the populated Chore list
      res.json({
        chores: foundGroup.populateChoreList(foundGroup.group_chores),
        error: "",
      });
    })
    .catch((err) => {
      console.log(err);
      res.status(404).json({
        error: "Unable to Retrieve Chore List for Group",
      });
    });
});

// Route                POST api/chores/
// Description          Adds a chore to the group.
// Access               Public I think
// Required Parameters
//      group_ID                The _id for the group adding the chore
//      chore_assigned_user:    GroupMember - The _id Group member currently assigned to the chore.
//      chore_user_pool:        [GroupMember] - Group members _ids that will rotate on this chore.
//      chore_name:             String - Name of the chore.
// Optional Parameters
//      chore_description:      String - Description of new chore
//      chore_point_value:      Number - Value of points this chore is worth completing
//      chore_schedule:         Schedule - Frequency of chore occurance
router.post("/add", jwt.authenticateUser, (req, res) => {
  const user_ID = req.body.user_ID;

  group
    .findById(req.body.group_ID)
    .then((g) => {
      // Verify Admin status of the user making the request
      if (!g.verifyAdmin(user_ID)) {
        //The user is not an admin ERROR
        return res.status(404).json({
          error: `User ${user_ID}: is not a Admin of group ${g.group_name}`,
        });
      }

      // Person to be assigned to the chore first and their index in the array.
      let assigned_person = req.body.chore_assigned_user;
      let assigned_index = req.body.chore_user_pool.indexOf(assigned_person);

      // If the intended assigned person was not in the user pool, put them at the end.
      if (assigned_index == -1) {
        req.body.chore_user_pool.push(assigned_person);
        assigned_index = req.body.chore_user_pool.length - 1;
      }

      // Create payload with required fields.
      const payload = {
        chore_assigned_user: assigned_person,
        chore_assigned_user_index: assigned_index,
        chore_user_pool: req.body.chore_user_pool,
        chore_name: req.body.chore_name,
      };

      // Check if non-required fields were filled out and add to payload.
      if (req.body.hasOwnProperty("chore_description"))
        payload["chore_description"] = req.body["chore_description"];
      if (req.body.hasOwnProperty("chore_point_value"))
        payload["chore_point_value"] = req.body["chore_point_value"];
      if (req.body.hasOwnProperty("chore_schedule"))
        payload["chore_schedule"] = req.body["chore_schedule"];

      // Update the group by adding the new chore to the chore list.
      const newChore = new chore(payload);
      g.group_chores.push(newChore);
      g.save().then(
        res.json({
          chores: g.group_chores,
        })
      );
    })
    .catch((err) => {
      console.log(err);
      res.status(404).json({
        error: "Could Not Add Your New Chore",
      });
    });
});

// Route                DELETE api/chores/
// Desc                 Deletes the chore.
// Access               Public
// Parameters
//      chore_ID:     String - ID of the chore to be deleted
//      group_ID:     String - ID of the group
//      user_ID:      String - ID of the user trying to delete the chores
//      token:        String - Token to verify the user
router.post("/delete", (req, res) => {
  group.findById(req.body.group_ID)
    .then(async g => {
      // Verify user is admin
      if (!g.verifyAdmin(req.body.user_ID)) {
        return res.status(401).json({
          error: "Permission Denied"
        });
      }

      // Find the chore.
      let choreIndex = -1;
      for (let i in g.group_chores) {
        if (g.group_chores[i]._id == req.body.chore_ID) {
          choreIndex = i;
          break;
        }
      }

      // If we didn't find the chore.
      if (choreIndex === -1) {
        return res.status(404).json({
          error: "Could Not Remove Chore"
        });
      }

      // Remove all members from the chore. g.group_chores[choreIndex]
      for (let member of g.group_chores[choreIndex].chore_user_pool)
        chore.removeMemberFromChore(g.group_chores[choreIndex]._id, member._id);

      const chores = await group.removeChore(g._id, g.group_chores[choreIndex]._id);
      res.json({
        chores: chores
      });
    })
    .catch(err => {
      console.log(err);
      res.status(404).json({
        error: "Could Not Delete Chore"
      });
    });
});

// Route        POST api/chores/edit
// Description  Edit chore (name, description, point value)
// Access       Public
// Parameters
//      user_ID:                  String - ID of admin editing chore
//      group_ID:                 String - ID of the group
//      chore_ID:                 String - ID of chore to be modified
//      chore_name:               String - Name of chore to be modified
//      chore_description:        String - Description of chore to be modified
//      chore_point_value:        Number - Point value of chore to be modified
router.post("/edit", (req, res) => {

  group.findById(req.body.group_ID)
  .then(async g => {
    // Verify user is admin
    if (!g.verifyAdmin(req.body.user_ID)) {
      return res.status(401).json({
        error: "Permission Denied"
      });
    }

    const updatedChore = await group.editChore({
      group_ID: g._id,
      chore_ID: req.body.chore_ID
    }, {
      chore_name: req.body.chore_name,
      chore_description: req.body.chore_description,
      chore_point_value: req.body.chore_point_value
    });

    if (updatedChore == null) {
      return res.status(404).json({
        error: "Could Not Find Chore"
      });
    }

    res.json(updatedChore);
  })
  .catch(err => {
    console.log(err);
    res.status(404).json({
      error: "Could Not Update Chore"
    });
  });
});

// Route                POST api/chores
// Desc                 Assigns a user to the chore queue.
// Access               Public
// Parameters
//      admin_user_ID:    String - ID of the group admin
//      member_ID:        String - Member ID of the user to be assigned to the chore
//      group_ID:         String - ID of the group
//      chore_ID:         String - ID of the chore
router.post("/assignUser", (req, res) => {

  group.findById(req.body.group_ID)
  .then(async g => {
    // Verify user is admin
    if (!g.verifyAdmin(req.body.admin_user_ID)) {
      return res.status(401).json({
        error: "Permission Denied"
      });
    }

    // Check if user is in the group.
    let personIndex = -1;
    for (let i in g.group_members) {
      if (g.group_members[i]._id == req.body.member_ID) {
        personIndex = i;
        break;
      }
    }

    // If we did not find the user to be added.
    if (personIndex === -1) {
      return res.status(404).json({
        error: "Could Not Find User in the Group"
      });
    }

    // Find Chore.
    let choreIndex = -1;
    for (let i in g.group_chores) {
      if (g.group_chores[i]._id == req.body.chore_ID) {
        choreIndex = i;
        break;
      }
    }

    // Did not find chore.
    if (choreIndex === -1) {
      return res.status(404).json({
        error: "Could Not Find Chore"
      });
    }

    const updatedChore = g.group_chores[choreIndex].assignUser(req.body.member_ID);
    if (updatedChore.error) {
      return res.status(404).json({
        error: updatedChore.error
      });
    }

    g.save(updatedChore).then(() => res.json(updatedChore));
  })
  .catch(err => {
    console.log(err);
    res.status(404).json({
      error: "Could Not Assign User To Chore"
    });
  });
});

// Route                POST api/chores
// Desc                 Removes the user from the chore queue
// Access               Public
// Parameters
//      admin_user_ID:    String - ID of a group admin
//      member_ID:        String - Member ID of user to be removed from the chore
//      group_ID:         String - ID of the group
//      chore_ID:         String - ID of the chore
router.post("/removeUser", (req, res) => {

  group.findById(req.body.group_ID)
  .then(g => {
    // Verify user is admin
    if (!g.verifyAdmin(req.body.admin_user_ID)) {
      return res.status(401).json({
        error: "Permission Denied"
      });
    }

    // Check if user is in the group.
    let personIndex = -1;
    for (let i in g.group_members) {
      if (g.group_members[i]._id == req.body.member_ID) {
        personIndex = i;
        break;
      }
    }

    // If we did not find the user to be removed.
    if (personIndex === -1) {
      return res.status(404).json({
        error: "Could Not Find User in the Group"
      });
    }

    // Find Chore.
    let choreIndex = -1;
    for (let i in g.group_chores) {
      if (g.group_chores[i]._id == req.body.chore_ID) {
        choreIndex = i;
        break;
      }
    }

    // Did not find chore.
    if (choreIndex === -1) {
      return res.status(404).json({
        error: "Could Not Find Chore"
      });
    }

    const updatedChore = g.group_chores[choreIndex].removeUser(req.body.member_ID);
    if (updatedChore.error) {
      return res.status(404).json({
        error: updatedChore.error
      });
    }

    g.save(updatedChore).then(() => res.json(updatedChore));
  })
  .catch(err => {
    console.log(err);
    res.status(404).json({
      error: "Could Not Remove the User"
    });
  });
});

// Route                POST api/chores
// Description          Update user chore queue
// Access               Public
// Parameters
//      _id:     String - ID of chore
router.post("/updatePool", (req, res) => {
  chore
    .findById(req.body._id)
    .then((c) => {
      // Current assignee moves to end of queue
      // Top member of queue is now assignee
      c.rotateAssignedUser(true, (err) => {
        throw err;
      });
    })
    .catch((err) => {
      console.log(err);
      res.json({
        error: "Unable to Update User Chore Pool",
      });
    });
});

// Route                POST api/chores
// Description          Updates the chore status and rotates the user if chore is finished.
// Access               Public
// Parameters
//      _id:    String - ID of the chore that will have to status updated
router.post("/updateStatus", (req, res) => {
  chore
    .findById(req.body._id)
    .then((c) => {
      c.checkCompletionStatus((err) => {
        throw err;
      });
    })
    .catch((err) => {
      console.log(err);
      res.json({
        error: "Could Not Update the Chore Status",
      });
    });
});

module.exports = router;