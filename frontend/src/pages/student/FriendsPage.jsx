import { useEffect, useState } from "react";
import { UserPlus, Search, UserCheck, X } from "lucide-react";
import Input from "../../components/Input";
import Button from "../../components/Button";
import { SkeletonCard } from "../../components/LoadingSkeleton";
import { getFriends, sendFriendRequest, acceptFriendRequest, rejectFriendRequest } from "../../services/api";

export default function FriendsPage() {
  const [data, setData] = useState({ friends: [], suggestions: [], requests: [] });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const res = await getFriends();
    setData(res);
    setLoading(false);
  }

  async function handleAdd(id) {
    await sendFriendRequest(id);
    loadData();
  }

  async function handleAccept(id) {
    await acceptFriendRequest(id);
    loadData();
  }

  async function handleReject(id) {
    await rejectFriendRequest(id);
    loadData();
  }

  const filteredSuggestions = data.suggestions.filter(s => s.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-3xl font-bold">Friends & Community</h1>
        <p className="mt-1 text-ink/50">Connect with other learners, share progress, and chat.</p>
      </div>

      {data.requests.length > 0 && (
        <section className="rounded-xl3 bg-surface p-6 shadow-card border border-primary/20">
          <h2 className="font-bold mb-4">Friend Requests ({data.requests.length})</h2>
          <div className="space-y-3">
            {data.requests.map(req => (
              <div key={req.id} className="flex items-center justify-between p-3 bg-canvas rounded-xl">
                <div>
                  <p className="font-bold text-sm">{req.senderName}</p>
                  <p className="text-xs text-ink/50">Wants to connect with you.</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleAccept(req.sender)} className="p-2 bg-success/10 text-success rounded-lg hover:bg-success hover:text-white transition-colors"><UserCheck size={18}/></button>
                  <button onClick={() => handleReject(req.sender)} className="p-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-colors"><X size={18}/></button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="grid gap-8 lg:grid-cols-2">
        <section>
          <h2 className="font-bold mb-4">Discover Students</h2>
          <Input icon={Search} placeholder="Search students..." value={search} onChange={(e) => setSearch(e.target.value)} className="mb-4" />
          
          <div className="space-y-3">
            {loading ? (
              <><SkeletonCard /><SkeletonCard /></>
            ) : filteredSuggestions.length > 0 ? (
              filteredSuggestions.map(s => (
                <div key={s.id} className="flex items-center justify-between p-4 bg-surface rounded-xl shadow-sm border border-border">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-canvas rounded-full flex items-center justify-center text-xl">{s.avatar}</div>
                    <div>
                      <p className="font-bold">{s.name}</p>
                      <p className="text-xs text-ink/50">Level {s.level} • {s.xp} XP</p>
                    </div>
                  </div>
                  {s.status === "none" && <Button size="sm" variant="outline" onClick={() => handleAdd(s.id)}>Add Friend</Button>}
                  {s.status === "requested" && <span className="text-xs font-bold text-ink/40 bg-canvas px-3 py-1.5 rounded-lg">Requested</span>}
                  {s.status === "incoming" && <span className="text-xs font-bold text-primary bg-primary/10 px-3 py-1.5 rounded-lg">Pending Reply</span>}
                </div>
              ))
            ) : (
              <p className="text-sm text-ink/50 text-center py-8">No new students found.</p>
            )}
          </div>
        </section>

        <section>
          <h2 className="font-bold mb-4">My Friends ({data.friends.length})</h2>
          <div className="space-y-3">
            {loading ? (
              <><SkeletonCard /></>
            ) : data.friends.length > 0 ? (
              data.friends.map(f => (
                <div key={f.id} className="flex items-center justify-between p-4 bg-surface rounded-xl shadow-sm border border-border">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-canvas rounded-full flex items-center justify-center text-xl">{f.avatar?.startsWith("data:image") ? <img src={f.avatar} alt="Avatar" className="w-full h-full object-cover rounded-full" /> : f.avatar}</div>
                    <div>
                      <p className="font-bold">{f.name}</p>
                      <p className="text-xs text-ink/50">Level {f.level} • Streak: {f.streak}🔥</p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-ink/50 text-center py-8 bg-surface rounded-xl shadow-sm border border-border">
                You haven't added any friends yet.
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
