import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { faGripVertical, faSearch } from "@fortawesome/free-solid-svg-icons";
import { CSS } from "@dnd-kit/utilities";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { Button, Modal } from "react-bootstrap";
import { removeOddSpaces } from "../../../../../common/utils.common";
import type { DisplayField } from "../../../utils/types";

const DraggableItem = memo(
  ({
    id,
    label,
    isActive,
    onToggle,
  }: Readonly<{
    id: string;
    label: string;
    isActive: boolean;
    onToggle: (id: string) => void;
  }>) => {
    const { attributes, listeners, setNodeRef, transform, transition } =
      useSortable({ id });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
    };

    return (
      <div
        ref={setNodeRef}
        style={style}
        className="list-group-item d-flex align-items-center justify-content-between"
      >
        <div className="form-check form-switch">
          <input
            type="checkbox"
            role="switch"
            id={`switch-${id}`}
            className="form-check-input"
            checked={isActive}
            onChange={() => onToggle(id)}
          />
          <label htmlFor={`switch-${id}`} className="form-check-label">
            {label}
          </label>
        </div>
        <button
          type="button"
          className="btn btn-link text-secondary p-1"
          style={{ cursor: "grab" }}
          title={`Drag to reorder ${label}`}
          {...attributes}
          {...listeners}
        >
          <FontAwesomeIcon icon={faGripVertical} />
        </button>
      </div>
    );
  }
);

const ConfigDisplayModal = <F extends string>({
  show,
  fields,
  legend,
  onClose,
  onReset,
  onApply,
}: Readonly<{
  show: boolean;
  fields: DisplayField<F>[];
  legend: Record<F, string>;
  onClose: () => void;
  onReset: () => void;
  onApply: (fields: DisplayField<F>[]) => void;
}>) => {
  // DEV temp for testing
  const renderCount = useRef(0);
  renderCount.current += 1;
  console.log(`ConfigDisplayModal render count: ${renderCount.current}`);

  // This state will hold the order of ALL fields shown in the list
  const [orderedFields, setOrderedFields] = useState<DisplayField<F>[]>(fields);

  const [searchTerm, setSearchTerm] = useState<string>("");

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Init or re-calculate orderedFields every time show changes
  useEffect(() => {
    if (show) {
      setOrderedFields(fields);
      setSearchTerm("");
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show]);

  const filteredFields = useMemo((): DisplayField<F>[] => {
    const optimizedSearchTerm = removeOddSpaces(searchTerm);
    if (!optimizedSearchTerm) return orderedFields;

    return orderedFields.filter((field) =>
      field.name.toLowerCase().includes(optimizedSearchTerm.toLowerCase())
    );
  }, [orderedFields, searchTerm]);

  const handleDragEnd = useCallback((e: DragEndEvent): void => {
    const { active, over } = e;
    if (over && active.id !== over.id) {
      setOrderedFields((fields) => {
        const oldIdx = fields.findIndex((f) => f.name === active.id);
        const newIdx = fields.findIndex((f) => f.name === over.id);
        return arrayMove(fields, oldIdx, newIdx);
      });
    }
  }, []);

  const handleToggleField = useCallback((id: string) => {
    setOrderedFields((fields) =>
      fields.map((f) => (f.name === id ? { ...f, visible: !f.visible } : f))
    );
  }, []);

  const handleReset = useCallback(() => {
    onReset();
    onClose();
  }, [onClose, onReset]);

  const handleApply = useCallback(() => {
    onApply(orderedFields);
    onClose();
  }, [onApply, orderedFields, onClose]);

  return (
    <Modal show={show} onHide={onClose} centered>
      <Modal.Header closeButton>
        <Modal.Title>Configure Display Columns</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        <div>
          {/* Search fields */}
          <div className="input-group mb-3">
            <label htmlFor="searchTerm" hidden aria-hidden>
              Search columns
            </label>
            <input
              type="text"
              id="searchTerm"
              name="searchTerm"
              className="form-control"
              placeholder="Search columns..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <span className="input-group-text">
              <FontAwesomeIcon icon={faSearch} />
            </span>
          </div>

          {/* Field list */}
          <div
            className="list-group overflow-auto"
            style={{ maxHeight: "50vh" }}
          >
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={orderedFields.map((f) => f.name)}
                strategy={verticalListSortingStrategy}
              >
                {filteredFields.map((field) => (
                  <DraggableItem
                    key={field.name}
                    id={field.name}
                    label={legend[field.name]}
                    isActive={field.visible}
                    onToggle={() => handleToggleField(field.name)}
                  />
                ))}
              </SortableContext>
            </DndContext>
          </div>
        </div>

        <button
          type="button"
          className="btn btn-outline-primary mt-3 w-100"
          onClick={handleReset}
        >
          Reset to Default
        </button>
      </Modal.Body>

      <Modal.Footer>
        <Button type="button" variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button type="button" variant="primary" onClick={handleApply}>
          Apply
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default memo(ConfigDisplayModal) as typeof ConfigDisplayModal;
