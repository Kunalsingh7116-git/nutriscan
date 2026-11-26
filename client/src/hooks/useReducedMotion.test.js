import { act, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MotionProvider, useMotionPreference } from './useReducedMotion';

function PreferenceProbe() {
  const { preference, reduced, changePreference } = useMotionPreference();
  return <><select aria-label="Motion" value={preference} onChange={event => changePreference(event.target.value)}>
    <option value="system">Device</option><option value="full">Full</option><option value="reduced">Reduced</option>
  </select><output>{reduced ? 'reduced' : 'full'}</output></>;
}

let media, listeners;
beforeEach(() => {
  localStorage.clear();
  listeners = new Set();
  media = { matches: true, addEventListener: (_, listener) => listeners.add(listener),
    removeEventListener: (_, listener) => listeners.delete(listener) };
  window.matchMedia = () => media;
});

test('full motion overrides a reduced device setting and persists after remount', () => {
  const view = render(<MotionProvider><PreferenceProbe /></MotionProvider>);
  expect(document.documentElement).toHaveAttribute('data-motion', 'reduced');
  fireEvent.change(screen.getByLabelText('Motion'), { target: { value: 'full' } });
  expect(document.documentElement).toHaveAttribute('data-motion', 'full');
  expect(localStorage.getItem('ns_motion')).toBe('full');
  view.unmount();
  expect(listeners.size).toBe(0);
  render(<MotionProvider><PreferenceProbe /></MotionProvider>);
  expect(document.documentElement).toHaveAttribute('data-motion', 'full');
});

test('device changes are followed only when the device option is selected', () => {
  media.matches = false;
  render(<MotionProvider><PreferenceProbe /></MotionProvider>);
  expect(document.documentElement).toHaveAttribute('data-motion', 'full');
  act(() => { media.matches = true; listeners.forEach(listener => listener()); });
  expect(document.documentElement).toHaveAttribute('data-motion', 'reduced');
  fireEvent.change(screen.getByLabelText('Motion'), { target: { value: 'reduced' } });
  act(() => { media.matches = false; listeners.forEach(listener => listener()); });
  expect(document.documentElement).toHaveAttribute('data-motion', 'reduced');
  fireEvent.change(screen.getByLabelText('Motion'), { target: { value: 'system' } });
  expect(document.documentElement).toHaveAttribute('data-motion', 'full');
});
