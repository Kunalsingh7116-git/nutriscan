import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import useReducedMotion from '../hooks/useReducedMotion';
export default function WeeklyChart({ week, date }) {
  const reducedMotion = useReducedMotion();
  return (            <ResponsiveContainer width="100%" height={153}>
              <BarChart data={week} margin={{ top: 8, right: 5, left: 0, bottom: 0 }} barSize={17}>
                <CartesianGrid vertical={false} stroke="#e9ede8" strokeDasharray="3 4" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#52645b' }} />
                <YAxis domain={[0, max => Math.max(max, 2000)]} tickCount={3} width={38} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#52645b' }} />
                <Tooltip cursor={{ fill: '#edf5ef' }} formatter={value => [`${value} kcal`, 'Calories']} />
                <Bar dataKey="calories" minPointSize={3} radius={[5, 5, 0, 0]}
                  isAnimationActive={!reducedMotion} animationDuration={650} animationEasing="ease-out">
                  {week.map(day => <Cell key={day.date} fill={day.date === date ? '#28724e' : '#9bc2a7'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>);
}
