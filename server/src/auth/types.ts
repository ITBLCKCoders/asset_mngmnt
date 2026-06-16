export interface User {
  userID: string;
  email: string;
  name: string;
  verified: boolean;
  sessionId?: string;
}

export interface Session {
  sessionID?: string;
  userID: string;
  refresh_token: string;
  ip: string;
  user_agent: string;
  last_activity: Date;
  expires: Date;
}
