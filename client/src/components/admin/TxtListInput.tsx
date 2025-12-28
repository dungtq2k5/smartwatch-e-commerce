import { faPlus, faXmark } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { memo, useCallback, useRef, useState } from "react";
import { removeOddSpaces } from "../../../../common/utils.common";
import toast from "react-hot-toast";
import { WARNING_EMOJI } from "../../configs";

const TxtListInput = memo(
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
    value: string[];
    onChange: (item: string, action: "add" | "delete") => void;
    placeholder: React.InputHTMLAttributes<HTMLInputElement>["placeholder"];
    disabled: React.InputHTMLAttributes<HTMLInputElement>["disabled"];
  }>) => {
    const [itemInput, setItemInput] = useState<string>("");

    const inputRef = useRef<HTMLInputElement>(null);

    const handleAdd = useCallback((): void => {
      if (disabled) return;

      const newItem = removeOddSpaces(itemInput);

      if (newItem) {
        setItemInput("");

        if (!value.includes(newItem)) {
          onChange(newItem, "add");
          inputRef.current?.focus();
          return;
        }

        toast(`${name} "${newItem}" already exists. No need to add again.`, {
          icon: WARNING_EMOJI,
        });
      }
    }, [disabled, itemInput, value, name, onChange]);

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
        {/* <label htmlFor={configs.fieldName} className="form-label">
          {label}
        </label> */}

        {value.length > 0 && (
          <div className="d-flex flex-wrap gap-2 mb-2">
            {value.map((item) => (
              <div
                key={item}
                className="badge bg-light text-dark border d-flex align-items-center gap-2 px-3 py-2 fw-normal"
              >
                <span>{item}</span>
                <button
                  type="button"
                  className="btn btn-link p-0 text-secondary d-flex align-items-center"
                  onClick={() => onChange(item, "delete")}
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
          <input
            type="text"
            name={name}
            id={id}
            className="form-control"
            placeholder={placeholder || `Add new ${name?.toLowerCase()}`}
            value={itemInput}
            onChange={(e) => setItemInput(e.target.value)}
            onKeyDown={handleAddByEnter}
            disabled={disabled}
            ref={inputRef}
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

export default TxtListInput;
