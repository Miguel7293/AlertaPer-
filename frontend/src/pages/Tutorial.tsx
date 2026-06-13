import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Page, Card, Button, Stepper } from '../components/ui';
import { useAuth } from '../auth/AuthContext';

const STEPS = [
  {
    title: '¿Qué es una denuncia?',
    body: 'Es el registro oficial de un hecho delictivo ante la policía. Tiene valor legal y permite que tu caso sea investigado.',
  },
  {
    title: 'Robo vs. Hurto',
    body: '',
    custom: 'robohurto',
  },
  {
    title: '¿Qué necesitas?',
    body: 'Tu DNI, la fecha y lugar del hecho, una descripción de lo ocurrido y, si tienes, evidencia (fotos, recibos).',
  },
  {
    title: 'Evidencia permitida',
    body: 'Fotos del lugar o de los objetos, recibos o boletas, capturas de pantalla y datos de testigos. Todo suma a tu caso.',
  },
  {
    title: '¿Qué pasa después?',
    body: 'Tu denuncia se registra, se verifica tu identidad y luego pasa a revisión y asignación policial hasta su resolución.',
  },
  {
    title: '¿Cómo hago seguimiento?',
    body: 'Recibes un código de seguimiento y notificaciones. Puedes ver el estado de tu caso cuando quieras.',
  },
];

export default function Tutorial() {
  const nav = useNavigate();
  const { user } = useAuth();
  const [i, setI] = useState(0);
  const step = STEPS[i];
  const last = i === STEPS.length - 1;

  function finish() {
    // route to wherever onboarding still needs the user
    if (user && !user.correoVerificado) nav('/onboarding/correo');
    else if (user && !user.facialCompleto) nav('/onboarding/rostro');
    else nav('/app');
  }

  return (
    <Page>
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-medium text-slate-500">Tutorial · {i + 1} de {STEPS.length}</span>
        <button onClick={finish} className="text-sm font-medium text-slate-400 hover:text-slate-600">Saltar</button>
      </div>
      <Stepper steps={STEPS.map((s) => s.title)} current={i} />

      <Card>
        <h2 className="text-lg font-bold text-slate-900">{step.title}</h2>
        {step.custom === 'robohurto' ? (
          <div className="mt-4 space-y-3">
            <div className="rounded-xl bg-orange-50 p-3">
              <p className="text-sm font-semibold text-orange-800">Robo</p>
              <p className="text-sm text-orange-700">Con violencia o amenaza contra la persona.</p>
            </div>
            <div className="rounded-xl bg-emerald-50 p-3">
              <p className="text-sm font-semibold text-emerald-800">Hurto</p>
              <p className="text-sm text-emerald-700">Sin violencia (por ejemplo, te lo quitaron sin que te dieras cuenta).</p>
            </div>
          </div>
        ) : (
          <p className="mt-3 text-sm leading-relaxed text-slate-600">{step.body}</p>
        )}
      </Card>

      <div className="mt-5 flex gap-3">
        {i > 0 && <Button variant="outline" onClick={() => setI(i - 1)}>Atrás</Button>}
        {last ? (
          <Button onClick={finish}>Empezar</Button>
        ) : (
          <Button onClick={() => setI(i + 1)}>Siguiente</Button>
        )}
      </div>
    </Page>
  );
}
