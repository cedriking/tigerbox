import { Connection } from "../tigerbox";

export default interface ConnectionMessage {
  id?: number;
  num?: number;
  number?: number;
  args?: any;
  type?: ConnectionMessageType;
  name?: string;
  data?: Object;
  code?: string;
  url?: string;
  api?: string[];
  connection?: Connection;
}

export type ConnectionMessageType =
  | 'method'
  | 'callback'
  | 'getApi'
  | 'setApi'
  | 'apiSetAsRemote'
  | 'disconnect'
  | 'message'
  | 'importSuccess'
  | 'importFailure'
  | 'executeSuccess'
  | 'executeFailure'
  | 'import'
  | 'importTiger'
  | 'execute';
