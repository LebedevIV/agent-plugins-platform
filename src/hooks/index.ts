/**
 * src/hooks/index.ts
 * 
 * Центральный экспорт всех hooks для упрощения импортов.
 * Предоставляет единую точку входа для всех hooks-функций.
 */

// Chrome API hooks
export {
    getActiveTab,
    getTabById,
    sendMessageToTab,
    manageSidebarForSite,
    configureSidebarOptions,
    storage
} from './useChromeApi';

// State management hooks
export {
    getOrCreateTabState,
    setTabState,
    getAllTabStates,
    addChatMessage,
    updateChatInput,
    clearChat,
    setActivePlugin,
    addRunningPlugin,
    removeRunningPlugin,
    initializeStateManager,
    removeTabStateFromLocal
} from './useStateManager';

// Plugin management hooks
export {
    getCompatibleSites,
    isSiteCompatible,
    getAvailablePlugins,
    runPlugin,
    interruptPlugin
} from './usePluginManager';

// Plugin handler hooks
export {
    getPluginsList,
    runPluginCommand,
    interruptPluginCommand,
    isPluginRunning,
    getRunningPlugins,
    getActivePlugin
} from './usePluginHandler';

// Sidebar controller hooks
export {
    configureSidePanelForTab,
    toggleSidebarDirectly,
    openSidebarForTab,
    closeSidebarForTab,
    getSidebarState,
    isSidebarOpen,
    isProtectedUrl
} from './useSidebarController';

// Message handler hooks
export {
    sendMessageWithResponse,
    ping,
    getTabStates
} from './useMessageHandler';

// Background script hooks
export {
    initializeBackgroundScript,
    handleUIMessage,
    handleHostApiMessage
} from './useBackgroundScript';

// Types
export type {
    ChatMessage,
    PluginChatState,
    TabState
} from './useStateManager';

export type {
    Plugin
} from './usePluginHandler'; 