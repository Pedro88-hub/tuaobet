import React from 'react';
import { Button } from '../ui/Button';
import { ReceiptText } from 'lucide-react';

const BetSlip: React.FC = () => {
  // No futuro, isso virá de um contexto ou store global
  const bets: any[] = [];

  return (
    <div className="bg-tuao-dark-800 rounded-xl p-4 border border-tuao-dark-700">
      <div className="flex items-center gap-2 mb-4">
        <ReceiptText className="text-tuao-primary" size={20} />
        <h3 className="text-lg font-semibold text-white">Cupom de Aposta</h3>
      </div>

      {bets.length === 0 ? (
        <div className="text-center py-8 text-tuao-text-secondary">
          <p className="mb-4">Seu cupom está vazio.</p>
          <p className="text-sm">
            Clique nas odds para adicionar uma aposta.
          </p>
        </div>
      ) : (
        // Lógica para exibir apostas
        <div className="space-y-4">
          {/* ... Lista de Apostas ... */}
        </div>
      )}

      {bets.length > 0 && (
        <div className="mt-4 pt-4 border-t border-tuao-dark-700 space-y-4">
          {/* ... Totais e Botão de Apostar ... */}
          <Button className="w-full" size="lg">Apostar</Button>
        </div>
      )}
    </div>
  );
};

export { BetSlip };