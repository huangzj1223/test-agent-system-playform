// eslint-disable  MC8yOmFIVnBZMlhwdTRUbGphRG1zWjg2Vm01U2RnPT06NmE2MzJkOGI=

import { useAppState } from './useAppState';
// eslint-disable  MS8yOmFIVnBZMlhwdTRUbGphRG1zWjg2Vm01U2RnPT06NmE2MzJkOGI=

export const useSettings = () => {
  const { llmSettings, updateLLMSettings } = useAppState();

  return {
    settings: llmSettings,
    updateSettings: updateLLMSettings,
  };
};
