import { Button, Mascot } from '@likho-ai/ui';
import { useMe } from '@likho-ai/web-sdk';
import { Link } from 'react-router';
import { Yesterday } from '../components/Yesterday';

const steps = [
  { title: 'Upload', body: 'A call recording in any format. From the browser, a script, or the dialer.' },
  {
    title: 'Detect the language',
    body: 'Hindi, Urdu or English, with the model’s probabilities kept for every call.',
  },
  {
    title: 'Write the script layer',
    body: 'What was said, in Devanagari, every second of the call.',
    example: 'नमस्ते, आपका ऑर्डर कल तक पहुँच जाएगा',
  },
  {
    title: 'Write the Hinglish',
    body: 'The same words in the Roman letters people type in chat, with your spellings.',
    example: 'namaste, aapka order kal tak pahunch jayega',
  },
];

export function HomePage() {
  const me = useMe();
  return (
    <div className="space-y-16">
      {me.data && <Yesterday />}
      <section className="grid items-center gap-10 md:grid-cols-[1.2fr_1fr]">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-eyebrow">
            Hindi, Urdu and English calls
          </p>
          <h1 className="mt-3 text-[clamp(44px,6.2vw,84px)] font-extrabold leading-[1.02] tracking-[-0.035em]">
            <span className="headline-gradient-1">Every call.</span>
            <br />
            <span className="headline-gradient-2">Every word.</span>
            <br />
            Written in Hinglish.
          </h1>
          <p className="mt-5 max-w-xl text-lg text-ink-2">
            Likho turns call recordings into text a team can read, search and correct. Every line is kept
            twice: as spoken, and in Hinglish.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Button variant="primary" asChild>
              <Link to={me.data ? '/recordings?upload=1' : '/login'}>Upload a call</Link>
            </Button>
            <Button asChild>
              <Link to="/recordings">See the recordings</Link>
            </Button>
          </div>
        </div>
        <div className="flex justify-center">
          <div className="rounded-card border border-line bg-surface p-6 shadow-card">
            <Mascot pose="idle" size={180} />
            <p className="mt-3 rounded-input bg-surface-2 px-3 py-2 text-sm">
              <span lang="hi">आप बोलिए, मैं लिख लेता हूँ।</span>
            </p>
          </div>
        </div>
      </section>

      <section aria-labelledby="steps">
        <h2 id="steps" className="text-2xl font-bold">
          From sound to Hinglish in four steps
        </h2>
        <ol className="mt-6 grid gap-4 md:grid-cols-2">
          {steps.map((step, i) => (
            <li key={step.title} className="rounded-card border border-line bg-surface p-6 shadow-card">
              <p className="text-sm font-semibold text-ink-3">Step {i + 1}</p>
              <h3 className="mt-1 text-lg font-bold">{step.title}</h3>
              <p className="mt-1 text-ink-2">{step.body}</p>
              {step.example && (
                <p
                  className="mt-3 rounded-input bg-surface-2 px-3 py-2 font-medium"
                  lang={i === 2 ? 'hi' : undefined}
                >
                  {step.example}
                </p>
              )}
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
