const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const GroupMember = require('./groupMember');
const Chore = require('./chore');


const GroupSchema = new Schema({
  group_name:{
      type: String,
      required: true
  },
  group_members:{
    type: [GroupMember.GroupMemberSchema],
    required: true
  },
  group_member_count: {
    type: Number,
    default: 1
  },
  group_description:{
    type: String,
    default: 'Our Great Group'
  },
  date_created:{
    type: Date,
    default: Date.now
  },
  group_chore_list: {
    type: [Chore.ChoreSchema]
  }

});

//A PRE-METHOD that fires before every user.save() call
//Checks to ensure that the  passwrod was not changed, if it has, then we need to recompute the hash
GroupSchema.pre('save', function(next) {
  var group = this;

  // only hash the password if it has been modified (or is new)
  if (!group.isModified('group_members')) return next();
  if(group.group_members.length === 0)
    Group.remove({_id: this._id})
});

//Add a user to the group_members []
GroupSchema.methods.addGroupMember = function(newMember, cb){
  //Format input data
  const data = {
    user_ID: newMember._id,
    user_name: newMember.name,
    completed_tasks: 0,
    point_balance: 0
  }



  // const added = this.group_members.addToSet(data)
  // if(added.length == 0){
  //   let err = `User: ${data.user_name} is already a member of Group: ${this.group_name}`
  //   return cb(err)
  // }

  const newGroupMember = new GroupMember.model(data);
  
  //Check for duplicate group
  var unique = true;
  this.group_members.every(member => {
    if(member.user_ID.equals(newGroupMember.user_ID)){ 
      unique = false;
      return false;
    }
    return true;
  })
  //If unique add
  if(unique){
    this.group_members.push(newGroupMember)
    this.save(cb);
    return
  }else{
    let err = `User: ${data.user_name} is already a member of Group: ${this.group_name}`
    return cb(err)
  }

}

//Remove a group member from the group_members []
GroupSchema.methods.removeGroupMember = function(curMemberID, cb) {
  this.group_members.pull(curMemberID);
  this.save(cb);
}

// ***ASSUMES curMemberID IS THE ID OF AN EXISTING GROUP MEMBER***
// Promotes a group member to admin
GroupSchema.methods.promoteGroupMember = function(curMemberID, cb) {
  this.group_members[curMemberID].admin = true;
  this.save(cb);
}

// ***ASSUMES curMemberID IS THE ID OF AN EXISTING GROUP MEMBER***
// Demotes a group member from admin
GroupSchema.methods.demoteGroupMember = function(curMemberID, cb) {
  this.group_members[curMemberID].admin = false;
  this.save(cb);
}

// Returns admin if admin is a member of this group, empty string otherwise
GroupSchema.methods.verifyAdmin = function(curMemberID, cb) {
  let res = this.group_members.filter(mem => curMemberID === mem.user_ID && mem.admin === true);
  // should just be length 1 if admin found, but just in case...
  return (res.length >= 1) ? res[0] : '';
}

// Returns member if member is a member of this group, empty string otherwise
GroupSchema.methods.verifyMember = function(curMemberID, cb) {
  let res = this.group_members.filter(mem => curMemberID === mem.user_ID);
  // should just be length 1 if user found, but just in case...
  return (res.length >= 1) ? res[0] : '';
}

GroupSchema.methods.ERROR_ADMIN = function(curMemberID, cb) {
  return `(Admin: ${curMemberID}) is not a member of group (Group: ${this.group_ID}) or is not an admin`;
}

GroupSchema.methods.ERROR_MEMBER = function(curMemberID, cb) {
  return `(Member: ${curMemberID}) is not a member of group (Group: ${this.group_ID})`;
}


const Group = mongoose.model('group', GroupSchema);
module.exports = Group;
