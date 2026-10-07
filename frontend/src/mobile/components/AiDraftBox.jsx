import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { MButton } from './MUi';
import { errMsg } from '../constants';

export const AiDraftBox = ({ onDraft, placeholder }) => {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    try {
      await onDraft(prompt);
      toast.success('Brouillon IA généré — vérifiez les lignes');
    } catch (e) {
      toast.error(errMsg(e, 'Échec de la génération IA'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-[#D4AF37]/30 bg-gradient-to-br from-[#D4AF37]/10 to-transparent p-4 space-y-3" data-testid="m-ai-box">
      <div className="flex items-center gap-2 text-[#E9C85A] text-sm font-semibold">
        <Sparkles className="h-4 w-4" /> Assistant IA (Claude)
      </div>
      <textarea
        data-testid="m-ai-prompt"
        rows={3}
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl bg-[#0B1120] border border-[#1E293B] p-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-[#D4AF37]/60"
      />
      <MButton data-testid="m-ai-generate-btn" onClick={run} loading={loading} className="w-full">
        <Sparkles className="h-4 w-4" /> Générer avec IA
      </MButton>
    </div>
  );
};
