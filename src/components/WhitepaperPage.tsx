import { BookOpen, Flame, Gem, Moon, ShieldCheck, Sparkles, Sun } from "lucide-react";
import { Section } from "./ui";

const phases = [
  {
    name: "First Dawn",
    supply: "1,000 worlds",
    share: "50%",
    price: "0.0002E",
    access: "Non-tradable Mint Pass required",
    tone: "Early access",
    copy: "The first half of the collection belongs to the earliest minters. Phase 1 gives them the widest entry point and a clear first-mover position without letting the entire collection disappear at once.",
  },
  {
    name: "Convergence",
    supply: "300 worlds",
    share: "15%",
    price: "0.0004E",
    access: "Public mint",
    tone: "New entry",
    copy: "Phase 2 keeps the door open for people who arrive after the first rush. It is smaller, but it still gives newer minters a real place in the collection.",
  },
  {
    name: "Ruinfall",
    supply: "500 worlds",
    share: "25%",
    price: "0.0005E",
    access: "Public mint",
    tone: "Rarity climbs",
    copy: "Phase 3 carries more rare visual outcomes. This is where the world starts to feel more unstable, and the art reflects that shift.",
  },
  {
    name: "Burned Horizon",
    supply: "200 worlds",
    share: "10%",
    price: "0.001E",
    access: "Tradable Mint Pass required",
    tone: "Final scarcity",
    copy: "Phase 4 is the smallest phase and the rarest visual pool. It rewards patience, reward-pass holders, and collectors who want the final edge of the world.",
  },
];

const passRows = [
  ["Initial passes", "1,500", "Early Phase 1 access"],
  ["Phase 1 reward passes", "400", "Used to mint in Phase 4"],
  ["Phase 2 reward passes", "600", "Used to mint in Phase 4"],
];

const rarityRows = [
  ["Common", "607", "30.35%"],
  ["Uncommon", "512", "25.60%"],
  ["Rare", "357", "17.85%"],
  ["Epic", "248", "12.40%"],
  ["Legendary", "219", "10.95%"],
  ["Mythic", "57", "2.85%"],
];

const phaseRarityRows = [
  ["Phase 1", "0 Legendary", "0 Mythic", "Built for access"],
  ["Phase 2", "3 Legendary", "0 Mythic", "Rarity starts to move"],
  ["Phase 3", "109 Legendary", "5 Mythic", "The rare pool opens up"],
  ["Phase 4", "107 Legendary", "52 Mythic", "78.50% Legendary or Mythic"],
];

const rewardRows = [
  ["Super Rare reward", "10 max", "0.50% of supply"],
  ["Rare reward", "20 max", "1.00% of supply"],
  ["Common reward", "Flexible", "Assigned from the reward pool"],
  ["No reward", "Remaining worlds", "Still part of the active collection"],
];

export function WhitepaperPage() {
  const scrollToOverview = () => {
    document.getElementById("phase-design")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="whitepaper-shell">
      <section className="whitepaper-hero">
        <div>
          <span className="whitepaper-kicker">Forgotten Worlds whitepaper</span>
          <h1>A phased mint for a world that gets stranger over time.</h1>
          <p>
            Forgotten Worlds is a 2,000-piece on-chain pixel world collection.
            It uses timed access, rising visual rarity, reward passes, marketplace fee sharing, and optional burn rewards.
          </p>
          <div className="whitepaper-actions">
            <button className="action soft" type="button" onClick={scrollToOverview}>
              <BookOpen size={17} />
              Read overview
            </button>
          </div>
        </div>
        <div className="whitepaper-orbit" aria-hidden="true">
          <Sun className="orbit-sun" size={72} />
          <Moon className="orbit-moon" size={54} />
          <Sparkles className="orbit-spark" size={30} />
        </div>
      </section>

      <Section title="The collection" icon={<ShieldCheck size={20} />}>
        <div className="whitepaper-summary">
          <div>
            <span>Total supply</span>
            <strong>2,000</strong>
            <p>Each NFT is a Forgotten World with on-chain metadata and generated SVG art.</p>
          </div>
          <div>
            <span>Mint structure</span>
            <strong>4 phases</strong>
            <p>The supply opens in chapters instead of one flat drop.</p>
          </div>
          <div>
            <span>Pass supply</span>
            <strong>2,500</strong>
            <p>1,500 initial passes, 400 Phase 1 reward passes, and 600 Phase 2 reward passes.</p>
          </div>
        </div>
      </Section>

      <Section title="Collection supply" icon={<ShieldCheck size={20} />}>
        <div className="whitepaper-table">
          <div className="whitepaper-table-head">
            <span>Phase</span>
            <span>Supply</span>
            <span>Price</span>
            <span>What it means</span>
          </div>
          {phases.map((phase) => (
            <div className="whitepaper-table-row" key={phase.name}>
              <strong>{phase.name}</strong>
              <span>{phase.supply}</span>
              <span>{phase.price}</span>
              <span>{phase.access}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Why phases exist" icon={<Sun size={20} />} className="whitepaper-phase-section" >
        <div id="phase-design" className="whitepaper-copy">
          <p>
            The phase system is there to balance two groups that usually get pushed against each other: early minters and later minters.
            Early minters should get an advantage. They showed up first, took the earlier risk, and helped set the collection in motion.
          </p>
          <p>
            But a fair collection should not make every good outcome disappear in the opening rush. Later minters need a real entry point too.
            That is why the later phases are smaller and carry stronger visual rarity. It keeps the early advantage intact while giving new collectors a reason to enter after Phase 1.
          </p>
          <p>
            Put simply: early minters get access and scale. Later minters get a better shot at rare worlds. Both sides matter.
          </p>
        </div>
      </Section>

      <div className="whitepaper-phase-grid">
        {phases.map((phase, index) => (
          <article className={`phase-card phase-tone-${Math.min(index + 1, 4)}`} key={phase.name}>
            <div className="phase-art">{index === 3 ? <Moon size={34} /> : <Sun size={34} />}</div>
            <span>{phase.supply} / {phase.share}</span>
            <h3>{phase.name}</h3>
            <strong>{phase.price}</strong>
            <b>{phase.access}</b>
            <p>{phase.copy}</p>
          </article>
        ))}
      </div>

      <Section title="Mint pass system" icon={<Sparkles size={20} />}>
        <div className="whitepaper-split">
          <div className="whitepaper-copy">
            <p>
              The pass system keeps access organized without making the whole collection feel closed. Initial passes are for the earliest mint window.
              Reward passes are for Phase 4, the final mint window.
            </p>
            <p>
              The full pass supply is 2,500: 1,500 initial passes, 400 Phase 1 reward passes, and 600 Phase 2 reward passes.
              That gives early supporters a clean first path while still leaving room for newer collectors to enter through reward-pass activity and the last phase.
            </p>
          </div>
          <div className="whitepaper-table compact">
            {passRows.map(([name, supply, note]) => (
              <div className="whitepaper-table-row" key={name}>
                <strong>{name}</strong>
                <span>{supply}</span>
                <span>{note}</span>
              </div>
            ))}
          </div>
        </div>
      </Section>

      <Section title="Trait rarity" icon={<Gem size={20} />}>
        <div className="whitepaper-rarity">
          <div className="whitepaper-copy">
            <p>
              The rarest visual tiers are not all front-loaded. Phase 1 has the largest supply and the strongest early position, but the later phases carry
              more epic, legendary, and mythic outcomes.
            </p>
            <p>
              That matters. If every rare world could be taken at the start, later minters would only be buying what was left over. Forgotten Worlds avoids
              that by letting rarity rise as the phases move toward night.
            </p>
          </div>
          <div className="rarity-list">
            {rarityRows.map(([tier, count, percentage]) => (
              <div key={tier}>
                <strong>{tier}</strong>
                <span>{count} worlds</span>
                <span>{percentage}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="whitepaper-table rarity-phase-table">
          <div className="whitepaper-table-head">
            <span>Phase</span>
            <span>Legendary</span>
            <span>Mythic</span>
            <span>Collector read</span>
          </div>
          {phaseRarityRows.map(([phase, legendary, mythic, note]) => (
            <div className="whitepaper-table-row" key={phase}>
              <strong>{phase}</strong>
              <span>{legendary}</span>
              <span>{mythic}</span>
              <span>{note}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Burn and claim economy" icon={<Flame size={20} />}>
        <div className="whitepaper-split">
          <div className="whitepaper-copy">
            <p>
              Burn rewards are optional. If a world is eligible, the holder can burn it for a reward when the reward pool supports that claim.
              The NFT is destroyed, so the active supply gets smaller.
            </p>
            <p>
              Claiming and fee sharing open after mintout. Until then, the focus stays on minting worlds and letting the collection settle.
            </p>
            <p>
              This is where holding starts to matter. The longer you hold an eligible reward world, the more valuable the choice can become, because fewer
              active worlds means future fee sharing and reward pressure are spread across a tighter group. Burning pays out, but holding keeps you in the active economy.
            </p>
          </div>
          <div className="whitepaper-note">
            <strong>Reward rarity is separate from visual rarity.</strong>
            <span>
              A world can look rare because of its traits. Burn rewards are their own category, with 10 Super Rare rewards and 20 Rare rewards at the top.
            </span>
          </div>
        </div>
        {/* <div className="whitepaper-table compact reward-table">
          {rewardRows.map(([tier, max, share]) => (
            <div className="whitepaper-table-row" key={tier}>
              <strong>{tier}</strong>
              <span>{max}</span>
              <span>{share}</span>
            </div>
          ))}
        </div> */}
      </Section>

      <Section title="Marketplace and fee sharing" icon={<ShieldCheck size={20} />}>
        <div className="whitepaper-copy">
          <p>
            The marketplace gives reward-pass holders a native place to list or move passes. Sales use a 15% fee, with 85% going to the seller.
            Pass listings are capped at a maximum of 0.0005E, keeping access from turning into a runaway price game.
          </p>
          <p>
            After mintout, marketplace fees can flow back into the world economy, and active NFT holders can share in them.
          </p>
          <p>
            A burned NFT no longer counts as active. That matters because future fee sharing is divided among the active worlds that remain.
            Holding can become stronger over time if more worlds leave the active supply.
          </p>
        </div>
      </Section>

      <Section title="TLDR" icon={<BookOpen size={20} />} className="tldr-section">
        <div className="tldr-layout">
          <div className="tldr-supply">
            <span>Total supply</span>
            <strong>2,000 NFTs</strong>
            <p>Four phases, two public windows, and two pass-gated windows.</p>
          </div>
          <div className="tldr-phase-list">
            {phases.map((phase, index) => (
              <article className={`tldr-phase phase-tone-${Math.min(index + 1, 4)}`} key={phase.name}>
                <span>Phase {index + 1}</span>
                <strong>{phase.supply.replace("worlds", "NFTs")}</strong>
                <b>{phase.price}</b>
                <small>{phase.access}</small>
              </article>
            ))}
          </div>
        </div>
        <div className="tldr-pass-card">
          <strong>How the pass system works</strong>
          <p>
            At mint launch, 1,500 free non-tradable Mint Passes will be available to claim. A non-tradable Mint Pass is required for Phase 1, and each pass allows up to 3 mints.
          </p>
          <p>
            After the first 1,000 NFTs are minted, 400 wallets will be randomly selected to receive an additional tradable Mint Pass. Those passes can be used for Phase 4 minting or sold on the marketplace.
          </p>
          <p>
            Phase 2 and Phase 3 are public. During Phase 2, every wallet that mints earns 2 tradable Mint Passes, creating another route into Phase 4.
          </p>
          <div className="tldr-note-row">
            <span>Max tradable pass listing</span>
            <strong>0.0005E</strong>
            <span>Phase 4</span>
            <strong>Mint Pass holders only</strong>
          </div>
        </div>
      </Section>
    </div>
  );
}
