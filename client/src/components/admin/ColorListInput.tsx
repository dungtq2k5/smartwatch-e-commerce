import React, { memo, useCallback, useRef, useState } from "react";
import type { ModelVariationCreate } from "../../../../common/types.common";
import toast from "react-hot-toast";
import { WARNING_EMOJI } from "../../configs";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faXmark } from "@fortawesome/free-solid-svg-icons";
import { removeOddSpaces } from "../../../../common/utils.common";

type Color = ModelVariationCreate["band"]["colors"][number];

const ColorListInput = memo(
  ({
    name,
    id,
    value,
    onChange,
    placeholder,
    disabled,
  }: Readonly<{
    name: React.InputHTMLAttributes<HTMLInputElement>["name"];
    id: React.InputHTMLAttributes<HTMLInputElement>["id"];
    value: Color[];
    onChange: (color: Color, action: "add" | "delete") => void;
    placeholder: React.InputHTMLAttributes<HTMLInputElement>["placeholder"];
    disabled: React.InputHTMLAttributes<HTMLInputElement>["disabled"];
  }>) => {
    const [colorInput, setColorInput] = useState<Color>({
      name: "",
      hex: "#000000",
    });

    const colorHexInputRef = useRef<HTMLInputElement>(null);

    const handleAdd = useCallback((): void => {
      if (disabled) return;

      const newColorName = removeOddSpaces(colorInput.name);
      const newColorHex = colorInput.hex;

      if (newColorName && newColorHex) {
        const newColor: Color = { name: newColorName, hex: newColorHex };

        const isDuplicate = value.some(
          (color) => color.name === newColorName || color.hex === newColorHex
        );
        if (!isDuplicate) {
          onChange(newColor, "add");
        } else {
          toast(
            `${name} with name "${newColorName}" or hex "${newColorHex}" already exists. No need to add again.`,
            {
              icon: WARNING_EMOJI,
            }
          );
        }

        setColorInput({ name: "", hex: "#000000" });
        colorHexInputRef.current?.focus();
      }
    }, [colorInput, disabled, value, name, onChange]);

    const handleAddByEnter = useCallback(
      (e: React.KeyboardEvent<HTMLInputElement>): void => {
        if (e.key === "Enter") {
          e.preventDefault();
          handleAdd();
        }
      },
      [handleAdd]
    );

    return (
      <div>
        {value.length > 0 && (
          <div className="d-flex flex-wrap gap-2 mb-2">
            {value.map((color) => (
              <div
                key={`${color.hex}-${color.name}`}
                className="badge bg-light text-dark border d-flex align-items-center gap-2 px-3 py-2 fw-normal"
              >
                <span
                  className="color-list-input-color-circle--g"
                  style={{ backgroundColor: color.hex }}
                ></span>
                <span>{color.name}</span>
                <button
                  type="button"
                  className="btn btn-link p-0 text-secondary d-flex align-items-center"
                  onClick={() => onChange(color, "delete")}
                  disabled={disabled}
                  title="Remove"
                >
                  <FontAwesomeIcon icon={faXmark} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="input-group">
          <span className="input-group-text p-1 bg-white">
            <input
              type="color"
              className="form-control form-control-color-input--g"
              id={`${id}-hex`}
              value={colorInput.hex}
              onChange={(e) =>
                setColorInput({ ...colorInput, hex: e.target.value })
              }
              disabled={disabled}
              title="Choose color"
              ref={colorHexInputRef}
            />
          </span>
          <input
            type="text"
            name={name}
            id={id}
            className="form-control"
            placeholder={placeholder || "Color name (e.g. Black)"}
            value={colorInput.name}
            onChange={(e) =>
              setColorInput({ ...colorInput, name: e.target.value })
            }
            onKeyDown={handleAddByEnter}
            disabled={disabled}
          />
          <button
            type="button"
            className="btn btn-outline-primary"
            onClick={handleAdd}
            disabled={disabled}
          >
            <FontAwesomeIcon icon={faPlus} className="me-1" />
            Add
          </button>
        </div>
      </div>
    );
  }
);

export default ColorListInput;
