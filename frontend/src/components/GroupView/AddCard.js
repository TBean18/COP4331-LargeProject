import React, { useState, useContext } from "react";

import AddIcon from "@material-ui/icons/Add";
import { IconButton } from "@material-ui/core";
import "./AddCard.css";
import AddCardFrontButton from "./AddCardFrontButton";
import SaveOutlinedIcon from "@material-ui/icons/SaveOutlined";
import CancelOutlinedIcon from "@material-ui/icons/CancelOutlined";
import { useForm } from "../../hooks/useForm";
import { createGroup } from "../../fetch/createGroup";
import { GlobalContext } from "../../context/GlobalState";

function AddCard() {
  // Fragment from when this used to be a class based component
  // constructor(props) {
  //     super(props)
  //     this.state = {
  //       adding: false,
  //       isFlipped: false,
  //     }
  //     this.toggleAdding = this.toggleAdding.bind(this);
  // }
  const initialState = {
    groupName: "",
    groupDescription: "",
  };
  //Define State
  const [adding, setAdding] = useState(false);
  const [values, setValues, resetValues] = useForm(initialState);
  const [errorMessage, setErrorMessage] = useState("");
  const { storeJWT } = useContext(GlobalContext);
  function toggleAdding() {
    setAdding(!adding);
  }

  const handleCancel = (e) => {
    e.preventDefault();
    //reset the state values
    resetValues(initialState);

    //Flip the card
    setAdding(!adding);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    createGroup(
      values.groupName,
      values.groupDescription,
      storeJWT,
      setErrorMessage
    );

    //Close the input boxes
    setAdding(!adding);
  };

  console.log("test");
  return (
    <div
      className={`row ${adding ? "addCard" : "addCard__initial"}`}
      onClick={!adding ? toggleAdding : null}
    >
      <IconButton>
        <AddIcon />
      </IconButton>

      <div className="addCard__front">
        <form>
          <div className="addCardFront__groupName">
            <input
              type="text"
              name="groupName"
              placeholder="Group Name"
              onChange={(e) => setValues(e)}
              value={values.groupName}
            />
          </div>
          <div className="addCardFront__groupDescription">
            <textarea
              type="text"
              rows="5"
              name="groupDescription"
              placeholder="Description"
              onChange={(e) => setValues(e)}
              value={values.groupDescription}
            />
          </div>
          <button className="hiddenSubmit" onClick={handleSubmit} type="submit">
            Hidden submit
          </button>
        </form>
      </div>

      <div className="addCard__options">
        <div className="addCard__option" onClick={handleSubmit}>
          <AddCardFrontButton
            Icon={SaveOutlinedIcon}
            title="Save"
            color="grey"
          />
        </div>
        <div className="addCard__option" onClick={handleCancel}>
          <AddCardFrontButton
            Icon={CancelOutlinedIcon}
            title="Cancel"
            color="grey"
          />
        </div>
      </div>
    </div>
  );
}

// Group name
// Description
export default AddCard;
