import { LifeBuoy, Book, MessageCircle, FileText, Mail, MessageSquare, MapPin } from "lucide-react";

export default function HelpSupportPage() {
  const resources = [
    { icon: Book, title: "Documentation", desc: "Read guides on how to use the platform." },
    { icon: MessageCircle, title: "Community Forum", desc: "Ask questions and share tips." },
    { icon: FileText, title: "FAQs", desc: "Find answers to common questions." },
  ];

  const whatsappNumbers = [
    "919513126915",
    "919620713526",
    "919845175710"
  ];

  const formatNumber = (num) => `+91 ${num.slice(2, 7)} ${num.slice(7)}`;

  return (
    <div className="mx-auto max-w-3xl space-y-8 pb-12">
      <div>
        <h1 className="text-3xl font-bold">Help & Support</h1>
        <p className="mt-1 text-ink/50">Need help? We're here for you.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {resources.map(({ icon: Icon, title, desc }) => (
          <div key={title} className="flex flex-col items-center gap-3 rounded-xl3 bg-surface p-6 text-center shadow-card hover:shadow-elevated transition-shadow cursor-pointer">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Icon size={24} />
            </div>
            <div>
              <p className="font-bold text-ink">{title}</p>
              <p className="mt-1 text-xs text-ink/50">{desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-6 mt-12">
        <h2 className="text-2xl font-bold border-b border-border pb-2">Contact Support</h2>
        
        <div className="grid gap-6 md:grid-cols-2">
          {/* Email Option */}
          <section className="rounded-xl3 bg-surface p-6 shadow-card border border-border flex flex-col items-center text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-canvas text-primary mb-4">
              <Mail size={32} />
            </div>
            <h3 className="text-lg font-bold">Contact via Email</h3>
            <p className="mt-2 text-sm text-ink/60 font-medium">bhanu@subhanu.com</p>
            <a 
              href="mailto:bhanu@subhanu.com"
              className="mt-6 flex items-center justify-center w-full rounded-xl bg-primary px-6 py-3 font-semibold text-white shadow-soft transition hover:bg-primary-dark"
            >
              Send Email
            </a>
          </section>

          {/* WhatsApp Option */}
          <section className="rounded-xl3 bg-surface p-6 shadow-card border border-border flex flex-col items-center text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-canvas text-[#25D366] mb-4">
              <MessageSquare size={32} />
            </div>
            <h3 className="text-lg font-bold">Contact via WhatsApp</h3>
            <p className="mt-2 text-sm text-ink/60">Our support team is available to chat.</p>
            
            <div className="w-full mt-6 space-y-3">
              {whatsappNumbers.map((num) => (
                <div key={num} className="flex items-center justify-between rounded-xl bg-canvas p-3">
                  <span className="text-sm font-bold text-ink">{formatNumber(num)}</span>
                  <a
                    href={`https://wa.me/${num}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 rounded-lg bg-[#25D366] px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-[#20b858] transition-colors"
                  >
                    Chat on WhatsApp
                  </a>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      {/* Company Information */}
      <section className="rounded-xl3 bg-surface p-8 shadow-card flex flex-col sm:flex-row items-center sm:items-start gap-6 border border-border mt-8">
        <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full bg-canvas text-ink/40">
          <MapPin size={28} />
        </div>
        <div className="text-center sm:text-left">
          <h2 className="text-xl font-bold mb-3">Company Address</h2>
          <div className="text-ink/70 space-y-1 font-medium">
            <p>50/7, Ground Floor,</p>
            <p>MSR Complex,</p>
            <p>39th Cross, 16th Main,</p>
            <p>4th T Block, Bengaluru,</p>
            <p>Karnataka 560041</p>
          </div>
        </div>
      </section>
    </div>
  );
}
