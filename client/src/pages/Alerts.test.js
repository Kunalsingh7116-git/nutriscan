import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import Alerts from './Alerts';
import api from '../utils/api';

jest.mock('../utils/api', () => ({ get: jest.fn(), patch: jest.fn() }));
jest.mock('../hooks/useReducedMotion', () => () => true);
jest.mock('../components/ui/NumberTicker', () => ({ value }) => <span>{value}</span>);
const entries = [
  { _id: 'a', alert_id: 'a', alert_type: 'High Fat', status: 'Unread', date: '2026-11-26', message: 'Fat reference exceeded.' },
  { _id: 'b', alert_id: 'b', alert_type: 'High Sodium', status: 'Read', date: '2026-11-25', message: 'Sodium reference exceeded.' },
];

test('animated filters retain correct results and counts after marking an alert read', async () => {
  api.get.mockResolvedValue({ data: entries });
  api.patch.mockResolvedValue({ data: {} });
  render(<MemoryRouter><Alerts /></MemoryRouter>);
  fireEvent.click(await screen.findByRole('button', { name: 'Unread, 1' }));
  expect(screen.getByRole('button', { name: 'Unread, 1' })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.queryByRole('heading', { name: 'High Sodium' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /Mark High Fat alert/ }));
  expect(await screen.findByRole('heading', { name: 'No unread alerts' })).toBeVisible();
  expect(api.patch).toHaveBeenCalledWith('/alerts/a/read');
  fireEvent.click(screen.getByRole('button', { name: 'Read, 2' }));
  expect(screen.getByRole('heading', { name: 'High Fat' })).toBeVisible();
  expect(screen.getByRole('heading', { name: 'High Sodium' })).toBeVisible();
});

test('failed read updates preserve the unread count and show recovery feedback', async () => {
  api.get.mockResolvedValue({ data: entries });
  api.patch.mockRejectedValue(new Error('offline'));
  render(<MemoryRouter><Alerts /></MemoryRouter>);
  fireEvent.click(await screen.findByRole('button', { name: /Mark High Fat alert/ }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Couldn’t update this alert');
  await waitFor(() => expect(screen.getByRole('button', { name: 'Unread, 1' })).toBeEnabled());
});
