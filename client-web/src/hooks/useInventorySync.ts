import { useEffect, useState } from 'react';
import * as signalR from '@microsoft/signalr';

interface StockUpdate {
  itemId: string;
  newStatus: 'Available' | 'Reserved' | 'Sold';
}

export const useInventorySync = () => {
  const [connection, setConnection] = useState<signalR.HubConnection | null>(null);
  const [latestUpdate, setLatestUpdate] = useState<StockUpdate | null>(null);

  useEffect(() => {
    // 1. Build the Hub URL (strip '/api' from our base URL environment variable)
    const baseUrl = import.meta.env.VITE_API_BASE_URL.replace('/api', '');
    const hubUrl = `${baseUrl}/inventoryHub`;

    // 2. Configure the SignalR Connection with Spring-back Auto Reconnect
    const newConnection = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl)
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000]) // Custom back-off retry logic
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    // 3. Register the exact event listener we named in our .NET backend
    newConnection.on("StockChanged", (itemId: string, newStatus: string) => {
      console.log(`Live Stock Update: Item ${itemId} is now ${newStatus}`);
      setLatestUpdate({ itemId, newStatus: newStatus as StockUpdate['newStatus'] });
    });

    // 4. Start the connection
    const startConnection = async () => {
      try {
        await newConnection.start();
        setConnection(newConnection);
      } catch (err) {
        console.error("SignalR Connection Failed: ", err);
      }
    };

    startConnection();

    // 5. Cleanup the websocket if the component unmounts
    return () => {
      newConnection.stop();
    };
  }, []);

  return { connection, latestUpdate };
};