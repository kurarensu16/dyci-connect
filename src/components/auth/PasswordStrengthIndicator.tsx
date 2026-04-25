import React from 'react';
import { FaCheck } from 'react-icons/fa';

interface PasswordStrengthIndicatorProps {
    password: string;
    onValidationChange?: (isValid: boolean) => void;
}

const PasswordStrengthIndicator: React.FC<PasswordStrengthIndicatorProps> = ({ password, onValidationChange }) => {
    const criteria = [
        { label: 'At least 10 characters', met: password.length >= 10 },
        { label: 'Contain one symbol', met: /[!@#$%^&*(),.?":{}|<>]/.test(password) },
        { label: 'Contain one capital letter', met: /[A-Z]/.test(password) },
        { label: 'Contain one number', met: /\d/.test(password) },
    ];

    const allMet = criteria.every(c => c.met);

    React.useEffect(() => {
        if (onValidationChange) {
            onValidationChange(allMet);
        }
    }, [allMet, onValidationChange]);

    return (
        <div className="space-y-2 px-1 py-2">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Security Standards</p>
            {criteria.map((c, i) => (
                <div key={i} className="flex items-center gap-2">
                    <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center border transition-all duration-300 ${c.met ? 'bg-emerald-500 border-emerald-500 shadow-sm shadow-emerald-200' : 'border-slate-300 bg-slate-50'}`}>
                        <FaCheck className={`w-2 h-2 text-white transition-opacity duration-300 ${c.met ? 'opacity-100' : 'opacity-0'}`} />
                    </div>
                    <span className={`text-[11px] font-medium transition-colors duration-300 ${c.met ? 'text-emerald-600' : 'text-slate-400'}`}>
                        {c.label}
                    </span>
                </div>
            ))}
        </div>
    );
};

export default PasswordStrengthIndicator;
