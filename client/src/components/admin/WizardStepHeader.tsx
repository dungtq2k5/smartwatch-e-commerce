import { memo, useMemo } from "react";
import type { ProductCreationWizardStep } from "../../utils/types";
import useCreationWizardStore from "../../store/admin/creationWizardStore";
import { PRODUCT_CREATION_WIZARD_STEPS } from "../../configs";
import Title from "./Title";

const WizardStepHeader = memo(
  ({
    currStep,
    title,
    parentTitle,
    parentLink,
    className,
  }: {
    currStep: ProductCreationWizardStep;
    title: React.ReactNode;
    parentTitle: string;
    parentLink: string;
    className?: string;
  }) => {
    const { isActive, startStep } = useCreationWizardStore();

    const { curr, total } = useMemo((): {
      curr: number;
      total: number;
    } => {
      const startIdx = PRODUCT_CREATION_WIZARD_STEPS.indexOf(
        startStep || "product"
      );
      const currIdx = PRODUCT_CREATION_WIZARD_STEPS.indexOf(currStep);

      // If somehow invalid or wizard not active -> return 0/0
      if (startIdx === -1 || currIdx === -1) {
        return { curr: 0, total: 0 };
      }

      return {
        curr: currIdx - startIdx + 1,
        total: PRODUCT_CREATION_WIZARD_STEPS.length - startIdx,
      };
    }, [currStep, startStep]);

    return (
      <>
        {isActive && startStep ? (
          <div className={className}>
            {/* Wizard Progress UI */}
            <div className="d-flex align-items-center justify-content-between mb-2">
              <div className="d-flex align-items-center gap-2">
                <span className="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25 rounded-pill px-3">
                  Creation Wizard
                </span>
                <span className="text-muted small fw-medium">
                  Step {curr} of {total}
                </span>
              </div>
              <span className="text-muted small">
                {Math.round((curr / total) * 100)}% Completed
              </span>
            </div>
            <div className="progress mb-3" style={{ height: "6px" }}>
              <progress
                className="progress-bar progress-filled-color-success--g"
                style={{ width: `${(curr / total) * 100 - 1}%` }}
                aria-valuenow={(curr / total) * 100 - 1}
                aria-valuemin={0}
                aria-valuemax={100}
              ></progress>
            </div>

            {/* Page Title */}
            <div className="d-flex justify-content-between align-items-center">
              <h1 className="fs-2 mb-0">{title}</h1>
            </div>
          </div>
        ) : (
          <Title
            title={title}
            parentTitle={parentTitle}
            parentLink={parentLink}
            className={className}
          />
        )}
      </>
    );
  }
);

export default WizardStepHeader;
