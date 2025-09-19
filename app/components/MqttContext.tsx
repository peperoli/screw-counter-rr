// Updated MQTT Context using Socket.IO instead of direct MQTT connection
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { useSocket } from './SocketContext'

interface MqttMessage {
  topic: string;
  payload: string;
  timestamp: string;
}

type MqttContextType = {
  client: null; // Kept for backward compatibility, but client is now handled via Socket.IO
  isConnected: boolean;
  mqttConnected: boolean;
  messages: MqttMessage[];
  subscribe: (topic: string) => Promise<void>;
  unsubscribe: (topic: string) => Promise<void>;
  publish: (topic: string, message: string, qos?: number) => Promise<void>;
}

const MqttContext = createContext<MqttContextType>({
  client: null,
  isConnected: false,
  mqttConnected: false,
  messages: [],
  subscribe: async () => {},
  unsubscribe: async () => {},
  publish: async () => {},
})

export const useMqtt = () => useContext(MqttContext)

type Props = { children: ReactNode }
export const MqttProvider = ({ children }: Props) => {
  const { isConnected, mqttStatus, messages, subscribe, unsubscribe, publish } = useSocket();

  const contextValue: MqttContextType = {
    client: null, // Legacy compatibility
    isConnected,
    mqttConnected: mqttStatus.connected,
    messages,
    subscribe,
    unsubscribe,
    publish,
  };

  return <MqttContext.Provider value={contextValue}>{children}</MqttContext.Provider>
}
