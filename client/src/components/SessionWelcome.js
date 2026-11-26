import { useAuth } from '../context/AuthContext';
import LogoWelcome from './LogoWelcome';

export default function SessionWelcome({ children }) {
  const { welcoming, finishWelcome } = useAuth();
  return <>
    <div className="session-pages" inert={welcoming ? '' : undefined} aria-hidden={welcoming || undefined}>{children}</div>
    {welcoming && <LogoWelcome signedIn onComplete={finishWelcome} />}
  </>;
}
