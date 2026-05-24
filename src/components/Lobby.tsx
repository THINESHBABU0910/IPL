"use client";



import { RoomState } from "@/lib/types";

import { Socket } from "socket.io-client";

import InviteFriendsCard from "./InviteFriendsCard";

import LobbyTeamGrid from "./LobbyTeamGrid";

import ParticipantsTab from "./ParticipantsTab";

import ChatPanel from "./ChatPanel";

import RoomSettingsTab from "./RoomSettingsTab";



export type LobbyTabId = "players" | "chat" | "settings";



interface LobbyProps {

  roomState: RoomState;

  myTeamId: string | null;

  socket: Socket;

  isSpectator: boolean;

  playerName?: string;

  isHost?: boolean;

  activeTab: LobbyTabId;

  roomId: string;

  soundOn: boolean;

  onToggleSound: () => void;

}



export default function Lobby({

  roomState, myTeamId, socket, isSpectator, playerName, isHost,

  activeTab, roomId, soundOn, onToggleSound,

}: LobbyProps) {

  const takenTeams = new Set(Object.keys(roomState.teams));

  const totalTeams = Object.keys(roomState.teams).length;

  const freeTeams = 10 - totalTeams;



  if (activeTab === "chat") {

    return (

      <div className="panel-fill px-2 pb-1">

        <ChatPanel

          messages={roomState.chat}

          socket={socket}

          disabled={isSpectator}

          playerName={playerName}

          tall

        />

      </div>

    );

  }



  if (activeTab === "settings") {

    return (

      <RoomSettingsTab

        roomState={roomState}

        socket={socket}

        isHost={!!isHost}

        roomId={roomId}

        soundOn={soundOn}

        onToggleSound={onToggleSound}

      />

    );

  }



  return (

    <div className="panel-fill flex flex-col px-2 pb-1 gap-2 min-h-0">

      <InviteFriendsCard roomId={roomId} />

      <LobbyTeamGrid

        myTeamId={myTeamId}

        takenTeams={takenTeams}

        playerName={playerName}

        socket={socket}

        isSpectator={isSpectator}

      />



      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">

        <ParticipantsTab

          roomState={roomState}

          myTeamId={myTeamId}

          playerName={playerName}

          isHost={isHost}

        />

      </div>



      <div className="shrink-0 pt-1 border-t border-[#2A2A2A]">

        <p className="text-[10px] text-gray-500 text-center mb-2">

          {totalTeams}/10 teams taken · {freeTeams} free

        </p>

        {!myTeamId && (
          <p className="text-center text-gray-400 text-xs mb-2">Tap any free team above (optional)</p>
        )}
        <button
          type="button"
          onClick={() => socket.emit("start-game")}
          className="w-full py-3 bid-btn rounded-xl text-black font-bold text-sm"
        >
          ▶ Start Game
        </button>

      </div>

    </div>

  );

}


