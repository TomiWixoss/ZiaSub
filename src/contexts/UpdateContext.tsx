/**
 * Update Context - Manages app update state
 */
import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";
import { updateService, UpdateCheckResult } from "@services/updateService";

interface UpdateContextType {
  hasUpdate: boolean;
  updateResult: UpdateCheckResult | null;
  showUpdateModal: () => void;
  dismissUpdate: () => void;
  checkForUpdate: () => Promise<void>;
  updateModalVisible: boolean;
  setUpdateModalVisible: (visible: boolean) => void;
}

const UpdateContext = createContext<UpdateContextType>({
  hasUpdate: false,
  updateResult: null,
  showUpdateModal: () => {},
  dismissUpdate: () => {},
  checkForUpdate: async () => {},
  updateModalVisible: false,
  setUpdateModalVisible: () => {},
});

export const useUpdate = () => useContext(UpdateContext);

interface UpdateProviderProps {
  children: React.ReactNode;
  autoCheck?: boolean;
}

export const UpdateProvider: React.FC<UpdateProviderProps> = ({
  children,
  autoCheck = false,
}) => {
  const [hasUpdate, setHasUpdate] = useState(false);
  const [updateResult, setUpdateResult] = useState<UpdateCheckResult | null>(
    null
  );
  const [updateModalVisible, setUpdateModalVisible] = useState(false);

  const checkForUpdate = useCallback(async () => {
    try {
      const result = await updateService.checkForUpdate();
      setUpdateResult(result);
      if (result.hasUpdate) {
        setHasUpdate(true);
        setUpdateModalVisible(true);
      }
    } catch (error) {
      console.error("Failed to check for update:", error);
    }
  }, []);

  const showUpdateModal = useCallback(() => {
    setUpdateModalVisible(true);
  }, []);

  const dismissUpdate = useCallback(() => {
    setUpdateModalVisible(false);
  }, []);

  useEffect(() => {
    if (autoCheck) {
      checkForUpdate();
    }
  }, [autoCheck, checkForUpdate]);

  const value: UpdateContextType = {
    hasUpdate,
    updateResult,
    showUpdateModal,
    dismissUpdate,
    checkForUpdate,
    updateModalVisible,
    setUpdateModalVisible,
  };

  return (
    <UpdateContext.Provider value={value}>{children}</UpdateContext.Provider>
  );
};

export default UpdateContext;
