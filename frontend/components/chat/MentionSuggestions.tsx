import { motion, AnimatePresence } from "framer-motion";
import { Avatar } from "../ui/Avatar";
import { User } from "lucide-react";

interface MentionSuggestionsProps {
  query: string;
  users: { id: string; username: string; displayName: string; avatarUrl?: string | null }[];
  onSelect: (username: string) => void;
  isOpen: boolean;
}

export function MentionSuggestions({ query, users, onSelect, isOpen }: MentionSuggestionsProps) {
  const filteredUsers = users.filter((u) => 
    u.username.toLowerCase().includes(query.toLowerCase()) || 
    u.displayName.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 5);

  return (
    <AnimatePresence>
      {isOpen && filteredUsers.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.95 }}
          className="absolute bottom-full left-0 mb-2 w-64 glass rounded-xl overflow-hidden shadow-2xl z-50 border border-white/10"
        >
          <div className="max-h-48 overflow-y-auto">
            {filteredUsers.map((user) => (
              <button
                key={user.id}
                onClick={() => onSelect(user.username)}
                className="w-full flex items-center gap-3 p-3 hover:bg-white/10 transition text-left"
              >
                <Avatar src={user.avatarUrl} name={user.displayName} className="w-8 h-8" />
                <div className="flex flex-col">
                  <span className="text-white text-sm font-medium">{user.displayName}</span>
                  <span className="text-white/50 text-xs">@{user.username}</span>
                </div>
              </button>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
