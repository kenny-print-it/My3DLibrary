import { ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

const SOCIALS = [
  {
    label: "YouTube",
    handle: "@hahakenny",
    url: "https://www.youtube.com/@hahakenny",
    bg: "bg-red-600",
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white" aria-hidden="true">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
      </svg>
    ),
  },
  {
    label: "Facebook",
    handle: "Kennyprintit",
    url: "https://www.facebook.com/Kennyprintit",
    bg: "bg-[#1877f2]",
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white" aria-hidden="true">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
  },
  {
    label: "Reddit",
    handle: "u/hahakenny",
    url: "https://www.reddit.com/user/hahakenny/",
    bg: "bg-[#ff4500]",
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white" aria-hidden="true">
        <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z" />
      </svg>
    ),
  },
  {
    label: "MakerWorld",
    handle: "@hahakenny",
    url: "https://makerworld.com/en/@hahakenny",
    bg: "bg-[#1db954]",
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white" aria-hidden="true">
        <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16zm-1-13v6l5-3-5-3z" />
      </svg>
    ),
  },
  {
    label: "MakerOnline",
    handle: "@Hahakenny_4641958",
    url: "https://www.makeronline.com/en/user/personalInfo/38395781-7e3e-46c3-990a-92e429c6a96a.html?_sasdk=faGFoYWtlbm55QGdtYWlsLmNvbQ",
    bg: "bg-[#e67e22]",
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white" aria-hidden="true">
        <path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zm1 17.93V18a1 1 0 0 0-2 0v1.93A8.001 8.001 0 0 1 4.07 13H6a1 1 0 0 0 0-2H4.07A8.001 8.001 0 0 1 11 4.07V6a1 1 0 0 0 2 0V4.07A8.001 8.001 0 0 1 19.93 11H18a1 1 0 0 0 0 2h1.93A8.001 8.001 0 0 1 13 19.93z" />
      </svg>
    ),
  },
];

export default function About() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero section */}
      <div className="bg-gradient-to-br from-[#1a2b4c] to-[#2d4a7a] text-white py-16 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <div className="flex justify-center mb-6">
            <img
              src="/kenny-logo.png"
              alt="Kenny Print It? Logo"
              className="w-40 h-40 rounded-full shadow-2xl border-4 border-[#b8973a] object-cover"
            />
          </div>
          <h1 className="text-4xl font-bold mb-2 tracking-tight">Kenny Print It?</h1>
          <p className="text-[#b8973a] text-lg font-semibold mb-3">
            3D Printing &amp; Designs
          </p>
          <p className="text-white/80 text-base max-w-xl mx-auto">
            Hobby, Cosplay, Toys, Gadgets &amp; Mods
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-6 py-12 space-y-8">

        {/* Social links */}
        <Card>
          <CardContent className="pt-6">
            <h2 className="text-xl font-bold mb-4">Find Kenny Online</h2>
            <div className="space-y-1">
              {SOCIALS.map((s, i) => (
                <div key={s.label}>
                  {i > 0 && <Separator className="my-2" />}
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 text-sm hover:text-primary transition-colors group py-1"
                  >
                    <div
                      className={`w-8 h-8 rounded-full ${s.bg} flex items-center justify-center flex-shrink-0`}
                    >
                      {s.icon}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="font-medium group-hover:underline">{s.label}</span>
                      <span className="text-xs text-muted-foreground truncate">{s.handle}</span>
                    </div>
                    <ExternalLink className="w-3 h-3 text-muted-foreground ml-auto flex-shrink-0" />
                  </a>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Ko-fi Support Card */}
        <Card className="border-[#ff5e5b]/30 bg-gradient-to-br from-[#ff5e5b]/5 to-[#ff5e5b]/10">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row items-center gap-5">
              {/* Ko-fi cup icon */}
              <div className="flex-shrink-0 w-16 h-16 rounded-2xl bg-[#ff5e5b] flex items-center justify-center shadow-lg">
                <svg viewBox="0 0 24 24" className="w-9 h-9 fill-white" aria-hidden="true">
                  <path d="M23.881 8.948c-.773-4.085-4.859-4.593-4.859-4.593H.723c-.604 0-.679.798-.679.798s-.082 7.324-.022 11.822c.164 2.424 2.586 2.672 2.586 2.672s8.267-.023 11.966-.049c2.438-.426 2.683-2.566 2.658-3.734 4.352.24 7.422-2.831 6.649-6.916zm-11.062 3.511c-1.246 1.453-4.011 3.976-4.011 3.976s-.121.119-.31.023c-.076-.057-.108-.09-.108-.09-.443-.441-3.368-3.049-4.034-3.954-.709-.965-1.041-2.7-.091-3.71.951-1.01 3.005-1.086 4.363.407 0 0 1.565-1.782 3.468-.963 1.904.82 1.832 2.692.723 4.311zm6.173.478c-.928.116-1.682.028-1.682.028V7.284h1.77s1.971.551 1.971 2.638c0 1.913-.985 2.667-2.059 3.015z" />
                </svg>
              </div>
              <div className="flex-1 text-center sm:text-left">
                <h2 className="text-lg font-bold mb-1">Support Kenny on Ko-fi</h2>
                <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                  My3DLibrary is free and always will be. If it saves you time or brings some order
                  to your collection, buying a coffee helps keep the project going!
                </p>
                <a
                  href="https://ko-fi.com/kennyprintit"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#ff5e5b] text-white text-sm font-semibold hover:bg-[#e54d4a] transition-colors shadow-md"
                >
                  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white" aria-hidden="true">
                    <path d="M23.881 8.948c-.773-4.085-4.859-4.593-4.859-4.593H.723c-.604 0-.679.798-.679.798s-.082 7.324-.022 11.822c.164 2.424 2.586 2.672 2.586 2.672s8.267-.023 11.966-.049c2.438-.426 2.683-2.566 2.658-3.734 4.352.24 7.422-2.831 6.649-6.916zm-11.062 3.511c-1.246 1.453-4.011 3.976-4.011 3.976s-.121.119-.31.023c-.076-.057-.108-.09-.108-.09-.443-.441-3.368-3.049-4.034-3.954-.709-.965-1.041-2.7-.091-3.71.951-1.01 3.005-1.086 4.363.407 0 0 1.565-1.782 3.468-.963 1.904.82 1.832 2.692.723 4.311zm6.173.478c-.928.116-1.682.028-1.682.028V7.284h1.77s1.971.551 1.971 2.638c0 1.913-.985 2.667-2.059 3.015z" />
                  </svg>
                  Buy me a coffee
                </a>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* About Kenny */}
        <Card>
          <CardContent className="pt-6">
            <h2 className="text-xl font-bold mb-4">About Kenny</h2>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">
              Hey, I'm Kenny, a dad from Virginia who turned a fascination with 3D printing into a
              full-blown obsession. <strong>Kenny Print It?</strong> is my personal hobby space where I
              tackle the ultimate maker question: "Can someone actually print that?" Whether I'm
              dialing in crisp details on a cosplay prop for the kids, engineering a rugged functional
              fix for around the house, or beta testing the latest multi-color hardware from Anycubic,
              I love pushing my machines to their absolute limits. When I'm not designing a new part
              from scratch or monitoring a print bed, I'm just a regular guy enjoying the challenge of
              turning digital ideas into physical reality.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              The maker community is all about sharing, so I put all my designs and project updates
              out there for everyone to use. You can hang out and watch my build journey on YouTube,
              download my latest printable models on MakerWorld and MakerOnline, or catch my
              day-to-day projects on Facebook and Reddit. If you've got a crazy project idea or just
              want to talk shop about slicer settings, feel free to connect — let's build something
              cool!
            </p>
          </CardContent>
        </Card>

        {/* About My3DLibrary */}
        <Card>
          <CardContent className="pt-6">
            <h2 className="text-xl font-bold mb-3 flex items-center gap-2">
              About My3DLibrary
              <Badge variant="secondary">v1.0 Beta</Badge>
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">
              My3DLibrary is a self-hosted 3D model library created by Kenny Print It? to help
              3D printing enthusiasts organize, browse, and manage their model collections.
              Built with AI-powered tagging, a built-in STL viewer, and support for multiple
              library locations across different drives.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Your files stay on your computer — My3DLibrary never uploads your models anywhere.
              Everything runs locally on your machine.
            </p>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground pb-4">
          <p>My3DLibrary v1.0 Beta — Created by Kenny Print It?</p>
          <p className="mt-1">3D Printing &amp; Designs — Hobby, Cosplay, Toys, Gadgets &amp; Mods</p>
        </div>
      </div>
    </div>
  );
}
