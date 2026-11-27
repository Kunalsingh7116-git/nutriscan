import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import axios from 'axios';
import { AuthProvider, useAuth } from './AuthContext';

jest.mock('../utils/routeLoaders', () => ({ preloadRoute: jest.fn() }));
jest.mock('axios', () => ({ defaults: { headers: { common: {} } }, get: jest.fn() }));

function Session() {
  const { user, loading, authError, retryAuth } = useAuth();
  return <><p>{authError ? 'Retry needed' : loading ? 'Loading' : user ? 'Signed in' : 'Signed out'}</p><button onClick={retryAuth}>Retry</button></>;
}

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  localStorage.setItem('ns_token', 'existing-session');
});

test('a timed-out session request preserves credentials and can be retried', async () => {
  axios.get.mockRejectedValueOnce({ code: 'ECONNABORTED' }).mockResolvedValueOnce({ data: { id: 'user' } });
  render(<AuthProvider><Session /></AuthProvider>);
  expect(await screen.findByText('Retry needed')).toBeVisible();
  expect(localStorage.getItem('ns_token')).toBe('existing-session');
  expect(axios.get.mock.calls[0][1]).toEqual(expect.objectContaining({ timeout: 15000, signal: expect.any(AbortSignal) }));
  fireEvent.click(screen.getByText('Retry'));
  expect(await screen.findByText('Signed in')).toBeVisible();
});

test('an invalid session is cleared when the server returns 401', async () => {
  axios.get.mockRejectedValueOnce({ response: { status: 401 } });
  render(<AuthProvider><Session /></AuthProvider>);
  expect(await screen.findByText('Signed out')).toBeVisible();
  expect(localStorage.getItem('ns_token')).toBeNull();
});
