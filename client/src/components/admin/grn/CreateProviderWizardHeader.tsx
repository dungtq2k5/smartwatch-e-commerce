import { memo } from "react";
import WizardStepHeader from "../WizardStepHeader";
import useProviderWizardStore from "../../../store/admin/wizard/providerWizardStore";
import { PROVIDER_CREATION_WIZARD_STEPS } from "../../../configs";
import type { ProviderCreationWizardStep } from "../../../utils/types";

const CreateProviderWizardHeader = memo(
  ({
    currStep,
    title,
    parentTitle,
    parentLink,
    className,
  }: {
    currStep: ProviderCreationWizardStep;
    title: React.ReactNode;
    parentTitle: string;
    parentLink: string;
    className?: string;
  }) => {
    const { isActive, startStep } = useProviderWizardStore();

    return (
      <WizardStepHeader
        currStep={currStep}
        title={title}
        parentTitle={parentTitle}
        parentLink={parentLink}
        className={className}
        isWizardActive={isActive}
        wizardStartStep={startStep}
        allWizardSteps={PROVIDER_CREATION_WIZARD_STEPS}
      />
    );
  },
);

export default CreateProviderWizardHeader;
