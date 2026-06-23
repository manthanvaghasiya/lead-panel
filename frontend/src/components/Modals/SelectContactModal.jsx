import React from 'react';
import { X } from 'lucide-react';
import { FaPhoneAlt, FaWhatsapp } from 'react-icons/fa';
import { extractMobileNumbers, defaultWhatsappMessage } from '../../utils/contactUtils';

export default function SelectContactModal({ lead, actionType, onClose }) {
  const numbers = extractMobileNumbers(lead?.mobile);

  const handleSelect = (number) => {
    if (actionType === 'call') {
      window.location.href = `tel:${number}`;
    } else if (actionType === 'whatsapp') {
      window.location.href = `whatsapp://send?phone=91${number}&text=${encodeURIComponent(defaultWhatsappMessage)}`;
    }
    onClose();
  };

  if (!lead || numbers.length === 0) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col">
        <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-slate-50">
          <div>
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              {actionType === 'call' ? (
                <><FaPhoneAlt className="text-blue-500" /> Select Number to Call</>
              ) : (
                <><FaWhatsapp className="text-green-500" /> Select WhatsApp Number</>
              )}
            </h3>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">for {lead.name}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 transition-colors p-1 rounded-md hover:bg-slate-200/50">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-4 flex flex-col gap-3">
          {numbers.map((num, idx) => (
            <button
              key={idx}
              onClick={() => handleSelect(num)}
              className="flex items-center justify-between w-full p-4 rounded-xl border border-slate-200 hover:border-cyan-300 hover:bg-cyan-50 transition-all group"
            >
              <span className="font-semibold text-slate-700 text-lg group-hover:text-cyan-700 transition-colors">
                {num}
              </span>
              <span className="text-xs font-bold px-2 py-1 bg-slate-100 text-slate-500 rounded-lg group-hover:bg-cyan-100 group-hover:text-cyan-600 transition-colors">
                Select
              </span>
            </button>
          ))}
        </div>
        
        <div className="p-3 border-t border-slate-100 bg-slate-50 flex justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 transition-colors">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
