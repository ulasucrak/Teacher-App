import { act, fireEvent, render, screen, within } from '@testing-library/react-native';
import { useEffect, useState } from 'react';

import { Button, useToast } from '@/components/ui';
import { Providers } from '@/features/forms/test-utils';
import { attendanceForm, plusMinusForm, tally } from '@/features/formview/fixtures';
import { useMarkBoard } from '@/features/formview/useMarkBoard';
import * as history from '@/features/history';
import * as sessions from '@/features/sessions/api';
import { todayIso } from '@/features/sessions/date';
import { useSessionFill } from '@/features/sessions/hooks/useSessionFill';
import { NEW_SESSION_ID } from '@/features/sessions/routes';
import { motion } from '@/theme';
import type { FormMarkRow, FormSessionRow, StudentRow } from '@/types/database';

import { ClassroomView } from './ClassroomView';

jest.mock('react-native/Libraries/Modal/Modal', () => jest.requireActual('@/test/nativeModalMock'));
jest.mock('./presentation', () => ({
  releasePresentationFullscreen: jest.fn(),
  subscribePresentationExit: jest.fn(() => jest.fn()),
  subscribeMotionPreference: jest.fn(() => jest.fn()),
}));
jest.mock('@/lib/realtime', () => ({ useRealtimeRefresh: jest.fn() }));
jest.mock('expo-router', () => ({
  useNavigation: () => ({ addListener: jest.fn(() => jest.fn()), setOptions: jest.fn() }),
}));
jest.mock('@/features/history/api', () => ({
  ...jest.requireActual('@/features/history/api'),
  getTallies: jest.fn(), addMark: jest.fn(), undoLastMark: jest.fn(), removeMark: jest.fn(),
}));
jest.mock('@/features/sessions/api', () => ({
  ...jest.requireActual('@/features/sessions/api'),
  findSessionByDate: jest.fn(), listStudents: jest.fn(), listEntries: jest.fn(), upsertEntries: jest.fn(),
}));

const day = todayIso();
let capturedToast: ReturnType<typeof useToast>;
let originalShow: ReturnType<typeof useToast>['show'];

// Hooks deliberately live outside the modal, as they do in the real form screens.
function DailyHarness() {
  const fill = useSessionFill({ classId: 'c1', formId: attendanceForm.id, sessionId: NEW_SESSION_ID, date: day, form: attendanceForm });
  return <ClassroomView form={attendanceForm} fill={fill} day={day} onDay={jest.fn()} onExit={jest.fn()} />;
}

function BoardHarness() {
  const board = useMarkBoard(plusMinusForm);
  const { reload } = board;
  const [open, setOpen] = useState(false);
  const toast = useToast();
  useEffect(() => { capturedToast = toast; originalShow = toast.show; reload(); }, [reload, toast]);
  return <>
    <Button label="Aç" testID="open-classroom" onPress={() => setOpen(true)} />
    {open ? <ClassroomView form={plusMinusForm} board={board} day={day} onDay={board.changeDay} onExit={() => setOpen(false)} /> : null}
  </>;
}

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  jest.mocked(sessions.findSessionByDate).mockResolvedValue({ id: 'session1', form_id: attendanceForm.id, status: 'published', session_date: day } as FormSessionRow);
  jest.mocked(sessions.listStudents).mockResolvedValue([{ id: 's1', full_name: 'Ali', number: '12' } as StudentRow]);
  jest.mocked(sessions.listEntries).mockResolvedValue([]);
  jest.mocked(sessions.upsertEntries).mockResolvedValue(undefined);
  jest.mocked(history.getTallies).mockResolvedValue([tally({ studentId: 's1', fullName: 'Ali', dayCounts: { arti: 1 } })]);
  jest.mocked(history.addMark).mockResolvedValue({ id: 'm1', option_key: 'arti' } as FormMarkRow);
  jest.mocked(history.undoLastMark).mockResolvedValue({ id: 'm1', option_key: 'arti' } as FormMarkRow);
});
afterEach(() => jest.useRealTimers());

async function editDaily() {
  await render(<DailyHarness />, { wrapper: Providers });
  await fireEvent.press(screen.getByTestId(`classroom-s1-${attendanceForm.options[0]!.key}`));
}

async function openBoard() {
  await render(<BoardHarness />, { wrapper: Providers });
  await fireEvent.press(screen.getByTestId('open-classroom'));
}

function notification() {
  return within(screen.getByTestId('classroom-screen')).getByTestId('classroom-notification-message');
}

it('shows an actual daily save error inside the modal and retains the unsaved draft', async () => {
  jest.mocked(sessions.upsertEntries).mockRejectedValue(new Error('write failed'));
  await editDaily();
  await fireEvent.press(screen.getByTestId('classroom-save'));
  expect(notification()).toHaveTextContent('Değişiklikler kaydedilemedi. Tekrar kaydedin.');
  expect(screen.getByTestId('classroom-save')).not.toBeDisabled();
  await act(async () => { jest.advanceTimersByTime(motion.toastVisibleMs * 2); });
  expect(notification()).toHaveTextContent(/Değişiklikler kaydedilemedi/);
  await fireEvent.press(screen.getByTestId('classroom-notification-dismiss'));
  expect(screen.queryByTestId('classroom-notification')).toBeNull();
});

it('shows the existing save success toast in the modal and dismisses it after the toast duration', async () => {
  await editDaily();
  await fireEvent.press(screen.getByTestId('classroom-save'));
  expect(notification()).toHaveTextContent('Kaydedildi');
  await act(async () => { jest.advanceTimersByTime(motion.toastVisibleMs); });
  expect(screen.queryByTestId('classroom-notification')).toBeNull();
});

it('automatically catches a failed mark from the existing board hook', async () => {
  jest.mocked(history.addMark).mockRejectedValue(new Error('write failed'));
  await openBoard();
  await fireEvent.press(screen.getByTestId('classroom-s1-arti'));
  expect(notification()).toHaveTextContent('İşaret kaydedilemedi. Bağlantınızı kontrol edip tekrar deneyin.');
});

it('celebrates a positive mark instead of repeating its success, confirms other marks and undo in the modal', async () => {
  await openBoard();
  await fireEvent.press(screen.getByTestId('classroom-s1-arti'));
  expect(screen.getByTestId('classroom-celebration')).toHaveTextContent('Ali, bir adım daha');
  expect(screen.queryByTestId('classroom-notification')).toBeNull();
  await fireEvent.press(screen.getByTestId('classroom-s1-eksi'));
  expect(notification()).toHaveTextContent('Ali: Eksi eklendi');
  await fireEvent.press(screen.getByTestId('classroom-undo-s1'));
  expect(notification()).toHaveTextContent('Artı geri alındı');
});

it('shows undo errors without claiming success', async () => {
  jest.mocked(history.undoLastMark).mockRejectedValue(new Error('write failed'));
  await openBoard();
  await fireEvent.press(screen.getByTestId('classroom-undo-s1'));
  expect(notification()).toHaveTextContent('İşaret geri alınamadı. Tekrar deneyin.');
});

it('keeps a new error visible when a previous success timer would expire', async () => {
  await openBoard();
  await fireEvent.press(screen.getByTestId('classroom-s1-arti'));
  await act(async () => { jest.advanceTimersByTime(motion.toastVisibleMs / 2); });
  jest.mocked(history.addMark).mockRejectedValue(new Error('write failed'));
  await fireEvent.press(screen.getByTestId('classroom-s1-arti'));
  await act(async () => { jest.advanceTimersByTime(motion.toastVisibleMs); });
  expect(notification()).toHaveTextContent(/İşaret kaydedilemedi/);
});

it('keeps show stable, restores root rendering on exit, and routes exclusively after reopening', async () => {
  await openBoard();
  expect(capturedToast.show).toBe(originalShow);
  await fireEvent.press(screen.getByTestId('classroom-exit'));
  expect(capturedToast.show).toBe(originalShow);
  await act(async () => { capturedToast.show('Normal form bildirimi'); });
  expect(screen.getByText('Normal form bildirimi')).toBeOnTheScreen();
  expect(screen.queryByTestId('classroom-notification')).toBeNull();
  await fireEvent.press(screen.getByTestId('open-classroom'));
  await act(async () => { capturedToast.show('Yeni hata', 'error'); });
  expect(notification()).toHaveTextContent('Yeni hata');
  expect(screen.getAllByText('Yeni hata')).toHaveLength(1);
});
