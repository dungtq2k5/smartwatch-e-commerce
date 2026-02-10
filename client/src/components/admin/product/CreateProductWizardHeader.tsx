import { memo } from "react";
import WizardStepHeader from "../WizardStepHeader";
import useCreationWizardStore from "../../../store/admin/wizard/creationWizardStore";
import { PRODUCT_CREATION_WIZARD_STEPS } from "../../../configs";
import type { ProductCreationWizardStep } from "../../../utils/types";

const CreateProductWizardHeader = memo(
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

    return (
      <WizardStepHeader
        currStep={currStep}
        title={title}
        parentTitle={parentTitle}
        parentLink={parentLink}
        className={className}
        isWizardActive={isActive}
        wizardStartStep={startStep}
        allWizardSteps={PRODUCT_CREATION_WIZARD_STEPS}
      />
    );
  },
);

export default CreateProductWizardHeader;
