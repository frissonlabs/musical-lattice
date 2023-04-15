import { flatMap, fromPairs, range, reduce, zip } from "lodash";
import PropTypes from "prop-types";
import React from "react";
import CSSModules from "react-css-modules";
import Tone from "tone";

import { Lattice } from "../../../models/Lattice";
import Location from "../../../models/Location";
import Cell from "../Cell";
import styles from "./index.css";

const KEYS = fromPairs(
  zip("ABCDEFGHIJKLMNOPQRSTUVWXYZ".split(""), range(65, 91))
);
KEYS.ARROW_LEFT = 37;
KEYS.ARROW_UP = 38;
KEYS.ARROW_RIGHT = 39;
KEYS.ARROW_DOWN = 40;

const DEFAULT_CELL_KEY_MAPPINGS = {
  [KEYS.Q]: [-5, +1],
  [KEYS.W]: [-4, +1],
  [KEYS.E]: [-3, +1],
  [KEYS.R]: [-2, +1],
  [KEYS.T]: [-1, +1],
  [KEYS.Y]: [0, +1],
  [KEYS.U]: [+1, +1],
  [KEYS.I]: [+2, +1],
  [KEYS.O]: [+3, +1],
  [KEYS.P]: [+4, +1],
  [KEYS.A]: [-4, 0],
  [KEYS.S]: [-3, 0],
  [KEYS.D]: [-2, 0],
  [KEYS.F]: [-1, 0],
  [KEYS.G]: [0, 0],
  [KEYS.H]: [+1, 0],
  [KEYS.J]: [+2, 0],
  [KEYS.K]: [+3, 0],
  [KEYS.L]: [+4, 0],
  [KEYS.Z]: [-3, -1],
  [KEYS.X]: [-2, -1],
  [KEYS.C]: [-1, -1],
  [KEYS.V]: [0, -1],
  [KEYS.B]: [+1, -1],
  [KEYS.N]: [+2, -1],
  [KEYS.M]: [+3, -1]
};
const OFFSET_DIRECTION_KEY_MAPPINGS = {
  [KEYS.ARROW_LEFT]: [-1, 0],
  [KEYS.ARROW_UP]: [0, +1],
  [KEYS.ARROW_RIGHT]: [+1, 0],
  [KEYS.ARROW_DOWN]: [0, -1]
};

class Honeycomb extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      mode: "mouse",
      mousedOverCell: null,
      activeCells: {},
      cellKeyMappings: reduce(
        DEFAULT_CELL_KEY_MAPPINGS,
        (object, location, key) => {
          return { ...object, [key]: Location.wrap(location) };
        },
        {}
      )
    };

    this._onGlobalKeyDown = this._onGlobalKeyDown.bind(this);
    this._onGlobalKeyUp = this._onGlobalKeyUp.bind(this);
    this._onCellMouseDown = this._onCellMouseDown.bind(this);
  }

  componentDidMount() {
    window.addEventListener("keydown", this._onGlobalKeyDown);
    window.addEventListener("keyup", this._onGlobalKeyUp);

    // Listen for global mouse click event
    document.addEventListener("mousedown", evt => {
      if (evt.target.className.indexOf("Cell") === -1) {
        // If the click was not on a cell, clear the active cells
        const cellLabels = Object.keys(this.state.activeCells);
        cellLabels.forEach(cellLabel => {
          const frequency = this.state.activeCells[cellLabel].frequency;
          this.props.synth.triggerRelease(frequency);
        });
        if (cellLabels.length > 0) {
          this.setState({ activeCells: {} });
        }
      }
    });
  }

  componentWillUnmount() {
    window.removeEventListener("keydown", this._onGlobalKeyDown);
    window.removeEventListener("keyup", this._onGlobalKeyUp);
  }

  render() {
    return (
      <div
        styleName="root"
        onMouseUp={this._onMouseUp}
        style={{
          height: `${this.props.lattice.height}px`,
          width: `${this.props.lattice.width}px`
        }}
      >
        {this._renderCells()}
        {this.props.children}
      </div>
    );
  }

  _renderCells() {
    return flatMap(this.props.lattice.cellLabelGroups, cellLabelGroup => {
      return cellLabelGroup.cellLabels.map(cellLabel => {
        return (
          <Cell
            key={cellLabel.name}
            label={cellLabel}
            group={cellLabelGroup.number}
            zIndex={this._determineZIndex(cellLabel)}
            onMouseDown={this._onCellMouseDown}
            isActive={this._isCellActive(cellLabel)}
            isEnabled={this._isCellEnabled(cellLabel)}
          />
        );
      });
    });
  }

  _onGlobalKeyDown(event) {
    if (
      this.state.mode === "keyboard" &&
      !event.shiftKey &&
      !event.ctrlKey &&
      !event.altKey &&
      !event.metaKey &&
      !event.repeat
    ) {
      if (event.keyCode in this.state.cellKeyMappings) {
        event.preventDefault();
        const cellLabel = this.props.lattice.findCellBy(
          this.state.cellKeyMappings[event.keyCode]
        );
        if (cellLabel != null) {
          if (this._isCellEnabled(cellLabel)) {
            this.setState(prevState => {
              const activeCells = {
                ...prevState.activeCells,
                [cellLabel.name]: cellLabel
              };
              return { activeCells };
            });
            this.props.synth.triggerAttack(cellLabel.frequency);
          }
        }
      } else if (event.keyCode in OFFSET_DIRECTION_KEY_MAPPINGS) {
        event.preventDefault();
        const offset = Location.wrap(
          OFFSET_DIRECTION_KEY_MAPPINGS[event.keyCode]
        );
        this.setState(prevState => {
          const cellKeyMappings = reduce(
            prevState.cellKeyMappings,
            (object, location, key) => {
              return { ...object, [key]: location.add(offset) };
            },
            {}
          );
          return { cellKeyMappings };
        });
      }
    }
  }

  _onGlobalKeyUp(event) {
    if (this.state.mode === "keyboard") {
      if (event.keyCode === KEYS.K && event.shiftKey) {
        event.preventDefault();
        this.setState({ mode: "mouse" });
      } else if (event.keyCode in this.state.cellKeyMappings) {
        event.preventDefault();
        const cellLabel = this.props.lattice.findCellBy(
          this.state.cellKeyMappings[event.keyCode]
        );
        if (cellLabel != null) {
          if (this._isCellEnabled(cellLabel)) {
            this.setState(prevState => {
              const activeCells = { ...prevState.activeCells };
              delete activeCells[cellLabel.name];
              return { activeCells };
            });
            this.props.synth.triggerRelease(cellLabel.frequency);
          }
        }
      }
    } else if (event.keyCode === KEYS.K) {
      event.preventDefault();
      this.setState({ mode: "keyboard" });
    }
  }

  _onCellMouseDown(cellLabel) {
    if (this._isCellEnabled(cellLabel)) {
      // If the cell is already active, then we're releasing it.
      if (this._isCellActive(cellLabel)) {
        this.setState(prevState => {
          const activeCells = { ...prevState.activeCells };
          delete activeCells[cellLabel.name];
          return { activeCells };
        });
        this.props.synth.triggerRelease(cellLabel.frequency);
      } else {
        this.setState(prevState => {
          const activeCells = {
            ...prevState.activeCells,
            [cellLabel.name]: cellLabel
          };
          return { activeCells };
        });
        this.props.synth.triggerAttack(cellLabel.frequency);
      }
    }
  }

  _determineZIndex(cellLabel) {
    if (
      (this.state.mousedOverCell &&
        this.state.mousedOverCell.equals(cellLabel)) ||
      this._isCellActive(cellLabel)
    ) {
      return 1;
    } else {
      return 0;
    }
  }

  _isCellActive(cellLabel) {
    if (this.state.activeCells) {
      return cellLabel.name in this.state.activeCells;
    } else {
      return false;
    }
  }

  _isCellEnabled(cellLabel) {
    return (
      this.state.mode !== "keyboard" ||
      Object.values(this.state.cellKeyMappings).some(location => {
        return cellLabel.location.equals(location);
      })
    );
  }
}

Honeycomb.propTypes = {
  synth: PropTypes.instanceOf(Tone.PolySynth),
  lattice: PropTypes.instanceOf(Lattice).isRequired,
  children: PropTypes.node.isRequired
};

export default CSSModules(Honeycomb, styles);
