import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';
import { BattleRoom, BattlePresence, generateRoomCode, generatePlayerId, getRandomPlayerName } from '@/types/battle';
import { Question, QuestionBank } from '@/types/quiz';

const PLAYER_ID_KEY = 'battle-player-id';
const PLAYER_NAME_KEY = 'battle-player-name';

const getOrCreatePlayerId = (): string => {
  let id = localStorage.getItem(PLAYER_ID_KEY);
  if (!id) {
    id = generatePlayerId();
    localStorage.setItem(PLAYER_ID_KEY, id);
  }
  return id;
};

const getOrCreatePlayerName = (): string => {
  let name = localStorage.getItem(PLAYER_NAME_KEY);
  if (!name) {
    name = getRandomPlayerName();
    localStorage.setItem(PLAYER_NAME_KEY, name);
  }
  return name;
};

interface BattleState {
  room: BattleRoom | null;
  isHost: boolean;
  playerId: string;
  playerName: string;
  opponentName: string | null;
  opponentPresent: boolean;
  currentQuestion: Question | null;
  myAnswer: number | null;
  opponentAnswer: number | null;
  roundResult: 'waiting' | 'correct' | 'wrong' | 'tie' | null;
  battleQuestions: Question[];
  isLoading: boolean;
  error: string | null;
}

export const useBattleRoom = (banks: QuestionBank) => {
  const [state, setState] = useState<BattleState>({
    room: null,
    isHost: false,
    playerId: getOrCreatePlayerId(),
    playerName: getOrCreatePlayerName(),
    opponentName: null,
    opponentPresent: false,
    currentQuestion: null,
    myAnswer: null,
    opponentAnswer: null,
    roundResult: null,
    battleQuestions: [],
    isLoading: false,
    error: null,
  });

  const channelRef = useRef<RealtimeChannel | null>(null);
  const questionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Generate battle questions from a topic
  const generateBattleQuestions = useCallback((subject: string, topic: string, count: number): Question[] => {
    const questions = banks[subject]?.[topic] || [];
    if (questions.length === 0) return [];

    // Shuffle and pick random questions
    const shuffled = [...questions].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(count, shuffled.length));
  }, [banks]);

  // Create a new battle room
  const createRoom = useCallback(async (subject: string, topic: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const roomCode = generateRoomCode();
      const questions = generateBattleQuestions(subject, topic, 5);
      
      if (questions.length < 3) {
        throw new Error('Not enough questions available for this topic');
      }

      const { data, error } = await supabase
        .from('quiz_battles')
        .insert({
          room_code: roomCode,
          host_id: state.playerId,
          subject,
          topic,
          total_questions: questions.length,
        })
        .select()
        .single();

      if (error) throw error;

      const room: BattleRoom = {
        id: data.id,
        roomCode: data.room_code,
        hostId: data.host_id,
        guestId: data.guest_id,
        subject: data.subject,
        topic: data.topic,
        status: data.status as 'waiting' | 'playing' | 'finished',
        hostScore: data.host_score,
        guestScore: data.guest_score,
        currentQuestion: data.current_question,
        totalQuestions: data.total_questions,
        winner: data.winner,
        createdAt: data.created_at,
      };

      setState(prev => ({
        ...prev,
        room,
        isHost: true,
        battleQuestions: questions,
        isLoading: false,
      }));

      // Join the realtime channel
      joinChannel(room.id, true, questions);

      return room;
    } catch (error: any) {
      setState(prev => ({ ...prev, isLoading: false, error: error.message }));
      return null;
    }
  }, [state.playerId, generateBattleQuestions]);

  // Join an existing battle room
  const joinRoom = useCallback(async (roomCode: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const { data, error } = await supabase
        .from('quiz_battles')
        .select('*')
        .eq('room_code', roomCode.toUpperCase())
        .single();

      if (error || !data) {
        throw new Error('Room not found. Check the code and try again.');
      }

      if (data.status !== 'waiting') {
        throw new Error('This battle has already started or finished.');
      }

      if (data.guest_id) {
        throw new Error('This room is already full.');
      }

      // Update room with guest
      const { error: updateError } = await supabase
        .from('quiz_battles')
        .update({ guest_id: state.playerId })
        .eq('id', data.id);

      if (updateError) throw updateError;

      // Generate questions (same seed as host would use)
      const questions = generateBattleQuestions(data.subject, data.topic, data.total_questions);

      const room: BattleRoom = {
        id: data.id,
        roomCode: data.room_code,
        hostId: data.host_id,
        guestId: state.playerId,
        subject: data.subject,
        topic: data.topic,
        status: 'waiting',
        hostScore: data.host_score,
        guestScore: data.guest_score,
        currentQuestion: data.current_question,
        totalQuestions: data.total_questions,
        winner: data.winner,
        createdAt: data.created_at,
      };

      setState(prev => ({
        ...prev,
        room,
        isHost: false,
        battleQuestions: questions,
        isLoading: false,
      }));

      // Join the realtime channel
      joinChannel(room.id, false, questions);

      return room;
    } catch (error: any) {
      setState(prev => ({ ...prev, isLoading: false, error: error.message }));
      return null;
    }
  }, [state.playerId, generateBattleQuestions]);

  // Join realtime channel for battle
  const joinChannel = useCallback((roomId: string, isHost: boolean, questions: Question[]) => {
    if (channelRef.current) {
      channelRef.current.unsubscribe();
    }

    const channel = supabase.channel(`battle:${roomId}`, {
      config: { presence: { key: state.playerId } }
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const presenceState = channel.presenceState();
        const players = Object.values(presenceState).flat() as unknown as BattlePresence[];
        const opponent = players.find(p => p.odId !== state.playerId);
        
        setState(prev => ({
          ...prev,
          opponentPresent: !!opponent,
          opponentName: opponent?.odName || null,
        }));
      })
      .on('broadcast', { event: 'start_game' }, ({ payload }) => {
        setState(prev => ({
          ...prev,
          room: prev.room ? { ...prev.room, status: 'playing', currentQuestion: 0 } : null,
          currentQuestion: questions[0] || null,
          myAnswer: null,
          opponentAnswer: null,
          roundResult: null,
        }));
      })
      .on('broadcast', { event: 'answer' }, ({ payload }) => {
        if (payload.playerId !== state.playerId) {
          setState(prev => ({ ...prev, opponentAnswer: payload.answerIndex }));
        }
      })
      .on('broadcast', { event: 'next_question' }, ({ payload }) => {
        const nextIndex = payload.questionIndex;
        setState(prev => ({
          ...prev,
          room: prev.room ? { ...prev.room, currentQuestion: nextIndex, hostScore: payload.hostScore, guestScore: payload.guestScore } : null,
          currentQuestion: questions[nextIndex] || null,
          myAnswer: null,
          opponentAnswer: null,
          roundResult: null,
        }));
      })
      .on('broadcast', { event: 'game_over' }, ({ payload }) => {
        setState(prev => ({
          ...prev,
          room: prev.room ? { ...prev.room, status: 'finished', winner: payload.winner, hostScore: payload.hostScore, guestScore: payload.guestScore } : null,
        }));
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            odId: state.playerId,
            odName: state.playerName,
            isHost,
            score: 0,
            currentAnswer: null,
            answeredAt: null,
          } as BattlePresence);
        }
      });

    channelRef.current = channel;
  }, [state.playerId, state.playerName]);

  // Start the battle (host only)
  const startBattle = useCallback(async () => {
    if (!state.room || !state.isHost || !channelRef.current) return;

    await supabase
      .from('quiz_battles')
      .update({ status: 'playing' })
      .eq('id', state.room.id);

    channelRef.current.send({
      type: 'broadcast',
      event: 'start_game',
      payload: { questionIndex: 0 },
    });

    setState(prev => ({
      ...prev,
      room: prev.room ? { ...prev.room, status: 'playing' } : null,
      currentQuestion: prev.battleQuestions[0] || null,
    }));
  }, [state.room, state.isHost, state.battleQuestions]);

  // Submit answer
  const submitAnswer = useCallback(async (answerIndex: number) => {
    if (!state.room || !channelRef.current || state.myAnswer !== null) return;

    setState(prev => ({ ...prev, myAnswer: answerIndex }));

    channelRef.current.send({
      type: 'broadcast',
      event: 'answer',
      payload: { playerId: state.playerId, answerIndex },
    });
  }, [state.room, state.playerId, state.myAnswer]);

  // Process round result when both players have answered
  useEffect(() => {
    if (state.myAnswer !== null && state.opponentAnswer !== null && state.currentQuestion) {
      const isMyAnswerCorrect = state.myAnswer === state.currentQuestion.correct;
      const isOpponentCorrect = state.opponentAnswer === state.currentQuestion.correct;

      let result: 'correct' | 'wrong' | 'tie';
      if (isMyAnswerCorrect && !isOpponentCorrect) {
        result = 'correct';
      } else if (!isMyAnswerCorrect && isOpponentCorrect) {
        result = 'wrong';
      } else {
        result = 'tie';
      }

      setState(prev => ({ ...prev, roundResult: result }));

      // Move to next question after delay (host controls)
      if (state.isHost) {
        questionTimeoutRef.current = setTimeout(() => {
          const nextIndex = (state.room?.currentQuestion || 0) + 1;
          const newHostScore = (state.room?.hostScore || 0) + (isMyAnswerCorrect ? 1 : 0);
          const newGuestScore = (state.room?.guestScore || 0) + (isOpponentCorrect ? 1 : 0);

          if (nextIndex >= state.battleQuestions.length) {
            // Game over
            const winner = newHostScore > newGuestScore ? 'host' : newGuestScore > newHostScore ? 'guest' : 'tie';
            
            supabase
              .from('quiz_battles')
              .update({ status: 'finished', winner, host_score: newHostScore, guest_score: newGuestScore, finished_at: new Date().toISOString() })
              .eq('id', state.room?.id);

            channelRef.current?.send({
              type: 'broadcast',
              event: 'game_over',
              payload: { winner, hostScore: newHostScore, guestScore: newGuestScore },
            });
          } else {
            // Next question
            supabase
              .from('quiz_battles')
              .update({ current_question: nextIndex, host_score: newHostScore, guest_score: newGuestScore })
              .eq('id', state.room?.id);

            channelRef.current?.send({
              type: 'broadcast',
              event: 'next_question',
              payload: { questionIndex: nextIndex, hostScore: newHostScore, guestScore: newGuestScore },
            });
          }
        }, 2500);
      }
    }
  }, [state.myAnswer, state.opponentAnswer, state.currentQuestion, state.isHost, state.room, state.battleQuestions]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe();
      }
      if (questionTimeoutRef.current) {
        clearTimeout(questionTimeoutRef.current);
      }
    };
  }, []);

  // Leave battle
  const leaveBattle = useCallback(() => {
    if (channelRef.current) {
      channelRef.current.unsubscribe();
      channelRef.current = null;
    }
    setState({
      room: null,
      isHost: false,
      playerId: getOrCreatePlayerId(),
      playerName: getOrCreatePlayerName(),
      opponentName: null,
      opponentPresent: false,
      currentQuestion: null,
      myAnswer: null,
      opponentAnswer: null,
      roundResult: null,
      battleQuestions: [],
      isLoading: false,
      error: null,
    });
  }, []);

  // Update player name
  const setPlayerName = useCallback((name: string) => {
    const trimmed = name.trim().slice(0, 20);
    localStorage.setItem(PLAYER_NAME_KEY, trimmed);
    setState(prev => ({ ...prev, playerName: trimmed }));
  }, []);

  return {
    ...state,
    createRoom,
    joinRoom,
    startBattle,
    submitAnswer,
    leaveBattle,
    setPlayerName,
    myScore: state.isHost ? state.room?.hostScore || 0 : state.room?.guestScore || 0,
    opponentScore: state.isHost ? state.room?.guestScore || 0 : state.room?.hostScore || 0,
  };
};
