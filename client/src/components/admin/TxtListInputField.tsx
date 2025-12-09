import { faPlus, faXmark } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { memo, useCallback, useRef, useState } from "react";
import { removeOddSpaces } from "../../../../common/utils.common";
import toast from "react-hot-toast";
import { WARNING_EMOJI } from "../../configs";

const TxtListInputField = memo(
  ({
    currList,
    onListChange,
    configs,
  }: Readonly<{
    currList: string[];
    onListChange: (item: string, action: "add" | "delete") => void;
    configs: {
      fieldName: string;
      label: string;
      placeholder?: string;
      disabled?: boolean;
    };
  }>) => {
    const { label, placeholder } = configs;

    const [itemInput, setItemInput] = useState<string>("");

    const inputRef = useRef<HTMLInputElement>(null);

    const handleAdd = useCallback(() => {
      if (configs.disabled) return;

      const newItem = removeOddSpaces(itemInput);

      if (newItem) {
        setItemInput("");

        if (!currList.includes(newItem)) {
          onListChange(newItem, "add");
          inputRef.current?.focus();
          return;
        }

        toast(`${label} "${newItem}" already exists. No need to add again.`, {
          icon: WARNING_EMOJI,
        });
      }
    }, [configs.disabled, itemInput, currList, label, onListChange]);

    const handleAddByEnter = useCallback(
      (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
          e.preventDefault();
          handleAdd();
        }
      },
      [handleAdd]
    );

    return (
      <div>
        <label htmlFor={configs.fieldName} className="form-label">
          {label}
        </label>

        {currList.length > 0 && (
          <div className="d-flex flex-wrap gap-2 mb-2">
            {currList.map((item) => (
              <div
                key={item}
                className="badge bg-light text-dark border d-flex align-items-center gap-2 px-3 py-2 fw-normal"
              >
                <span>{item}</span>
                <button
                  type="button"
                  className="btn btn-link p-0 text-secondary d-flex align-items-center"
                  onClick={() => onListChange(item, "delete")}
                  disabled={configs.disabled}
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
            name={configs.fieldName}
            id={configs.fieldName}
            className="form-control"
            placeholder={placeholder || `Add new ${label.toLowerCase()}`}
            value={itemInput}
            onChange={(e) => setItemInput(e.target.value)}
            onKeyDown={handleAddByEnter}
            disabled={configs.disabled}
            ref={inputRef}
          />
          <button
            type="button"
            className="btn btn-outline-primary"
            onClick={handleAdd}
            disabled={configs.disabled}
          >
            <FontAwesomeIcon icon={faPlus} className="me-1" />
            Add
          </button>
        </div>
      </div>
    );
  }
);

export default TxtListInputField;
