import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Book from '../models/book.model.js';
import { freeBooks, paidBooks } from '../config/booksCatalog.js';
import fs from 'fs';
import path from 'path';

dotenv.config();

// Comprehensive verified real metadata mapping for the catalog
export const REAL_METADATA_MAP = {
  // --- Public Domain Classics (Gutenberg ID Mapping) ---
  "The Great Gatsby": {
    gutenbergId: 64317,
    isbn: "9780743273565",
  },
  "Pride and Prejudice": {
    gutenbergId: 1342,
    isbn: "9780141439518",
  },
  "Frankenstein": {
    gutenbergId: 84,
    isbn: "9780141439471",
  },
  "Moby-Dick": {
    gutenbergId: 2701,
    isbn: "9780142437247",
  },
  "Alice's Adventures in Wonderland": {
    gutenbergId: 11,
    isbn: "9780141439761",
  },
  "Dracula": {
    gutenbergId: 345,
    isbn: "9780141439846",
  },
  "The Adventures of Sherlock Holmes": {
    gutenbergId: 1661,
    isbn: "9780141034355",
  },
  "The Picture of Dorian Gray": {
    gutenbergId: 174,
    isbn: "9780141439570",
  },
  "Jane Eyre": {
    gutenbergId: 1260,
    isbn: "9780141441146",
  },
  "Wuthering Heights": {
    gutenbergId: 768,
    isbn: "9780141439556",
  },
  "Crime and Punishment": {
    gutenbergId: 2554,
    isbn: "9780140449136",
  },
  "War and Peace": {
    gutenbergId: 2600,
    isbn: "9781400079988",
  },
  "The Brothers Karamazov": {
    gutenbergId: 28054,
    isbn: "9780374528379",
  },
  "The Count of Monte Cristo": {
    gutenbergId: 1184,
    isbn: "9780140449266",
  },
  "Les Misérables": {
    gutenbergId: 135,
    isbn: "9780140444308",
  },
  "The Time Machine": {
    gutenbergId: 35,
    isbn: "9780141439976",
  },
  "The War of the Worlds": {
    gutenbergId: 36,
    isbn: "9780141441030",
  },
  "The Metamorphosis": {
    gutenbergId: 5200,
    isbn: "9780553213690",
  },
  "The Odyssey": {
    gutenbergId: 1727,
    isbn: "9780140268866",
  },
  "The Iliad": {
    gutenbergId: 6130,
    isbn: "9780140275369",
  },
  "Don Quixote": {
    gutenbergId: 996,
    isbn: "9780060934347",
  },
  "Meditations": {
    gutenbergId: 2680,
    isbn: "9780140449334",
  },
  "Beyond Good and Evil": {
    gutenbergId: 4363,
    isbn: "9780140449235",
  },
  "The Republic": {
    gutenbergId: 1497,
    isbn: "9780140455113",
  },
  "The Art of War": {
    gutenbergId: 132,
    isbn: "9781590302255",
  },
  "The Prince": {
    gutenbergId: 1232,
    isbn: "9780140449150",
  },
  "Great Expectations": {
    gutenbergId: 1400,
    isbn: "9780141439563",
  },
  "A Tale of Two Cities": {
    gutenbergId: 98,
    isbn: "9780141439600",
  },
  "Sense and Sensibility": {
    gutenbergId: 161,
    isbn: "9780141439662",
  },
  "Emma": {
    gutenbergId: 158,
    isbn: "9780141439587",
  },
  "The Three Musketeers": {
    gutenbergId: 1257,
    isbn: "9780199538461",
  },
  "The Secret Garden": {
    gutenbergId: 113,
    isbn: "9780141321066",
  },
  "Peter Pan": {
    gutenbergId: 16,
    isbn: "9780141329796",
  },
  "The Wonderful Wizard of Oz": {
    gutenbergId: 55,
    isbn: "9780141321028",
  },
  "The Call of the Wild": {
    gutenbergId: 215,
    isbn: "9780141321059",
  },
  "White Fang": {
    gutenbergId: 910,
    isbn: "9780141321110",
  },
  "Heart of Darkness": {
    gutenbergId: 219,
    isbn: "9780141441672",
  },
  "Walden": {
    gutenbergId: 205,
    isbn: "9780140390445",
  },
  "Leaves of Grass": {
    gutenbergId: 1322,
    isbn: "9780140421996",
  },
  "The Jungle Book": {
    gutenbergId: 236,
    isbn: "9780141325293",
  },
  "Treasure Island": {
    gutenbergId: 120,
    isbn: "9780141321004",
  },
  "The Strange Case of Dr. Jekyll and Mr. Hyde": {
    gutenbergId: 43,
    isbn: "9780141439730",
  },
  "Siddhartha": {
    gutenbergId: 2500,
    isbn: "9780142437186",
  },
  "A Study in Scarlet": {
    gutenbergId: 244,
    isbn: "9780141034294",
  },
  "The Hound of the Baskervilles": {
    gutenbergId: 2852,
    isbn: "9780141034331",
  },
  "Ulysses": {
    gutenbergId: 4300,
    isbn: "9780199535675",
  },
  "Dubliners": {
    gutenbergId: 2814,
    isbn: "9780140186475",
  },
  "A Portrait of the Artist as a Young Man": {
    gutenbergId: 4217,
    isbn: "9780142437346",
  },
  "A Room with a View": {
    gutenbergId: 2641,
    isbn: "9780141183299",
  },
  "Howards End": {
    gutenbergId: 2891,
    isbn: "9780141182131",
  },
  "The Age of Innocence": {
    gutenbergId: 541,
    isbn: "9780140189704",
  },
  "Ethan Frome": {
    gutenbergId: 4517,
    isbn: "9780140189728",
  },
  "The Yellow Wallpaper": {
    gutenbergId: 1952,
    isbn: "9780143105855",
  },
  "The Awakening": {
    gutenbergId: 160,
    isbn: "9780142437322",
  },
  "My Antonia": {
    gutenbergId: 242,
    isbn: "9780140187649",
  },

  // --- Commercial, Tech, and Modern Non-Fiction (Real ISBN Covers) ---
  "Clean Code": { isbn: "9780132350884" },
  "JavaScript: The Good Parts": { isbn: "9780596517748" },
  "Dune": { isbn: "9780441172719" },
  "The Pragmatic Programmer": { isbn: "9780135957059" },
  "Introduction to Algorithms (CLRS)": { isbn: "9780262033848" },
  "Introduction to Algorithms": { isbn: "9780262033848" },
  "Designing Data-Intensive Applications": { isbn: "9781449373320" },
  "You Don't Know JS: Scope & Closures": { isbn: "9781449335588" },
  "Eloquent JavaScript": { isbn: "9781593279509" },
  "Python Crash Course": { isbn: "9781593279288" },
  "Fluent Python": { isbn: "9781491946008" },
  "The Rust Programming Language": { isbn: "9781718500440" },
  "Head First Design Patterns": { isbn: "9780596007126" },
  "Refactoring: Improving the Design of Existing Code": { isbn: "9780134757599" },
  "Domain-Driven Design": { isbn: "9780321125217" },
  "Site Reliability Engineering": { isbn: "9781491929124" },
  "Building Microservices": { isbn: "9781491950357" },
  "Clean Architecture": { isbn: "9780134494166" },
  "The Mythical Man-Month": { isbn: "9780201835953" },
  "Code Complete": { isbn: "9780735619678" },
  "Atomic Habits": { isbn: "9780735211292" },
  "Deep Work": { isbn: "9781455586691" },
  "Sapiens: A Brief History of Humankind": { isbn: "9780062316097" },
  "Thinking, Fast and Slow": { isbn: "9780374275631" },
  "Zero to One": { isbn: "9780804139298" },
  "The Lean Startup": { isbn: "9780307887894" },
  "Man's Search for Meaning": { isbn: "9780807014295" },
  "1984": { isbn: "9780451524935" },
  "Brave New World": { isbn: "9780060850524" },
  "To Kill a Mockingbird": { isbn: "9780060935467" },
  "The Catcher in the Rye": { isbn: "9780316769488" },
  "Fahrenheit 451": { isbn: "9781451673319" },
  "Animal Farm": { isbn: "9780451526342" },
  "Lord of the Flies": { isbn: "9780399501487" },
  "The Alchemist": { isbn: "9780062315007" },
  "A Brief History of Time": { isbn: "9780553380163" },
  "Cosmos": { isbn: "9780345331359" },
  "The Selfish Gene": { isbn: "9780199291151" },
  "Guns, Germs, and Steel": { isbn: "9780393317558" },
  "Steve Jobs": { isbn: "9781451648539" },
  "Educated": { isbn: "9780399590504" },
  "Becoming": { isbn: "9781524763138" },
  "Shoe Dog": { isbn: "9781501135927" },
  "Principles: Life and Work": { isbn: "9781501124020" },
  "Good to Great": { isbn: "9780066620992" },
  "Start with Why": { isbn: "9781591846444" },
  "The 7 Habits of Highly Effective People": { isbn: "9781982137274" },
  "Thinking in Systems": { isbn: "9781603580557" },
  "Cracking the Coding Interview": { isbn: "9780984782857" },
  "Structure and Interpretation of Computer Programs": { isbn: "9780262510875" },
  "The Linux Programming Interface": { isbn: "9781593272203" },
  "Operating Systems: Three Easy Pieces": { isbn: "9781985086593" },
  "Computer Systems: A Programmer's Perspective": { isbn: "9780134092669" },
  "Learning React": { isbn: "9781492051725" },
  "Node.js Design Patterns": { isbn: "9781839214110" },
  "Database Internals": { isbn: "9781492040347" },
  "High Performance Browser Networking": { isbn: "9781449344764" },
  "Kubernetes: Up and Running": { isbn: "9781492046530" },
  "Terraform: Up & Running": { isbn: "9781492046905" },
  "The DevOps Handbook": { isbn: "9781942788003" },
  "Accelerate": { isbn: "9781942788331" },
  "Continuous Delivery": { isbn: "9780321601919" },
  "Release It!": { isbn: "9781680502398" },
  "System Design Interview – An Insider's Guide": { isbn: "9798664653403" },

  // --- Additional Classics & Public Domain (Real Gutenberg & Open Library) ---
  "The Trial": { gutenbergId: 7849, isbn: "9780805209990" },
  "The Invisible Man": { gutenbergId: 5230, isbn: "9780141439983" },
  "Dr. Jekyll and Mr. Hyde": { gutenbergId: 43, isbn: "9780141439730" },
  "Gulliver's Travels": { gutenbergId: 829, isbn: "9780141439495" },
  "Robinson Crusoe": { gutenbergId: 521, isbn: "9780141439822" },
  "The Scarlet Letter": { gutenbergId: 33, isbn: "9780142437261" },
  "The Prophet": { gutenbergId: 58585, isbn: "9780394404288" },
  "The Jungle": { gutenbergId: 140, isbn: "9780140390315" },
  "Notes from Underground": { gutenbergId: 600, isbn: "9780679734529" },
  "The Interpretation of Dreams": { gutenbergId: 5858, isbn: "9780380010004" },
  "The Communist Manifesto": { gutenbergId: 61, isbn: "9780140447576" },
  "The Wealth of Nations": { gutenbergId: 3300, isbn: "9780140432084" },
  "On the Origin of Species": { gutenbergId: 1228, isbn: "9780140439120" },
  "Relativity: The Special and General Theory": { gutenbergId: 5001, isbn: "9780517884416" },
  "Common Sense": { gutenbergId: 147, isbn: "9780140390162" },
  "The Souls of Black Folk": { gutenbergId: 408, isbn: "9780140189988" },

  // --- Additional Technical, Business & Modern Classics ---
  "Fullstack Node.js": { isbn: "9781987527926" },
  "Understanding Distributed Systems": { isbn: "9798771142272" },
  "Computer Networking: A Top-Down Approach": { isbn: "9780133594140" },
  "Artificial Intelligence: A Modern Approach": { isbn: "9780136042594" },
  "Deep Learning": { isbn: "9780262035613" },
  "Hands-On Machine Learning": { isbn: "9781492032649" },
  "Pattern Recognition and Machine Learning": { isbn: "9780387310732" },
  "The Hundred-Page Machine Learning Book": { isbn: "9781999579500" },
  "Grokking Deep Learning": { isbn: "9781617293702" },
  "Python for Data Analysis": { isbn: "9781491957660" },
  "The Psychology of Money": { isbn: "9780857197689" },
  "The Innovator's Dilemma": { isbn: "9781633691780" },
  "Hooked": { isbn: "9781591847786" },
  "Inspired": { isbn: "9781119387503" },
  "Measure What Matters": { isbn: "9780525536222" },
  "Rework": { isbn: "9780307463746" },
  "The Hard Thing About Hard Things": { isbn: "9780062273208" },
  "Venture Deals": { isbn: "9781119594826" },
  "Never Split the Difference": { isbn: "9780062407801" },
  "Influence: The Psychology of Persuasion": { isbn: "9780061241895" },
  "Predictably Irrational": { isbn: "9780061353246" },
  "Essentialism": { isbn: "9780804137386" },
  "So Good They Can't Ignore You": { isbn: "9781455509126" },
  "Make Time": { isbn: "9780525572428" },
  "Mindset: The New Psychology of Success": { isbn: "9780345472328" },
  "Grit": { isbn: "9781501111105" },
  "Outliers: The Story of Success": { isbn: "9780316017923" },
  "The Tipping Point": { isbn: "9780316316965" },
  "Range": { isbn: "9780735214484" },
  "Peak: Secrets from the New Science of Expertise": { isbn: "9780544456235" },
  "Flow: The Psychology of Optimal Experience": { isbn: "9780061339202" },
  "Antifragile": { isbn: "9781400067824" },
  "The Black Swan": { isbn: "9781400063512" },
  "Fooled by Randomness": { isbn: "9780812975215" },
  "Skin in the Game": { isbn: "9780425284629" },
  "Freakonomics": { isbn: "9780060731328" },
  "Superfreakonomics": { isbn: "9780060889579" },
  "Nudge": { isbn: "9780143115266" },
  "Misbehaving: The Making of Behavioral Economics": { isbn: "9780393080949" },
  "Factfulness": { isbn: "9781250107817" },
  "The Demon-Haunted World": { isbn: "9780345409461" },
  "Pale Blue Dot": { isbn: "9780345376596" },
  "The Blind Watchmaker": { isbn: "9780393315707" },
  "Gödel, Escher, Bach: An Eternal Golden Braid": { isbn: "9780465026562" },
  "What If?": { isbn: "9780544272996" },
  "Six Easy Pieces": { isbn: "9780465025275" },
  "Surely You're Joking, Mr. Feynman!": { isbn: "9780393316049" },
  "The Character of Physical Law": { isbn: "9780262533416" },
  "Astrophysics for People in a Hurry": { isbn: "9780393609394" },
  "Seven Brief Lessons on Physics": { isbn: "9780399184413" },
  "The Order of Time": { isbn: "9780735216105" },
  "Chaos: Making a New Science": { isbn: "9780143113454" },
  "The Information: A History, a Theory, a Flood": { isbn: "9781400096237" },
  "Neuromancer": { isbn: "9780441569595" },
  "Snow Crash": { isbn: "9780553380958" },
  "Foundation": { isbn: "9780553293357" },
  "Foundation and Empire": { isbn: "9780553293371" },
  "Second Foundation": { isbn: "9780553293364" },
  "I, Robot": { isbn: "9780553294385" },
  "2001: A Space Odyssey": { isbn: "9780451457998" },
  "Rendezvous with Rama": { isbn: "9780553287899" },
  "Do Androids Dream of Electric Sheep?": { isbn: "9780345404473" },
  "Ubik": { isbn: "9780547572291" },
  "The Left Hand of Darkness": { isbn: "9780441478125" },
  "The Dispossessed": { isbn: "9780060512750" },
  "Hyperion": { isbn: "9780553283686" },
  "The Three-Body Problem": { isbn: "9780765382030" },
  "The Dark Forest": { isbn: "9780765386694" },
  "Death's End": { isbn: "9780765386632" },
  "Project Hail Mary": { isbn: "9780593135204" },
  "The Martian": { isbn: "9780804139021" },
};

/**
 * Execute enrichment against MongoDB
 */
async function runEnrichment() {
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error("No MONGODB_URI in environment.");
    await mongoose.connect(uri);
    console.log("[Enrichment] Connected to MongoDB Atlas.");

    const allBooks = await Book.find();
    console.log(`[Enrichment] Processing ${allBooks.length} books in database...`);

    let updatedCount = 0;

    for (const book of allBooks) {
      const meta = REAL_METADATA_MAP[book.name] || REAL_METADATA_MAP[book.name.trim()];
      let updates = {};

      if (meta) {
        if (meta.gutenbergId) {
          const gid = meta.gutenbergId;
          updates.image = `https://www.gutenberg.org/cache/epub/${gid}/pg${gid}.cover.medium.jpg`;
          updates.sourceProvider = 'gutenberg';
          updates.sourceId = `gutenberg_${gid}`;
          updates.sourceUrl = `https://www.gutenberg.org/ebooks/${gid}`;
          updates.formats = {
            epub: `https://www.gutenberg.org/ebooks/${gid}.epub3.images`,
            pdf: `https://www.gutenberg.org/files/${gid}/${gid}-h/${gid}-h.htm`,
            text: `https://www.gutenberg.org/cache/epub/${gid}/pg${gid}.txt`,
          };
          updates.rightsStatus = 'verified_public_domain';
          updates.license = 'Project Gutenberg License / Public Domain';
        } else if (meta.isbn) {
          const isbn = meta.isbn;
          updates.image = `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`;
          updates.sourceProvider = 'openlibrary';
          updates.sourceId = `isbn_${isbn}`;
          updates.sourceUrl = `https://openlibrary.org/isbn/${isbn}`;
          updates.formats = {
            epub: '',
            pdf: `https://openlibrary.org/isbn/${isbn}`,
            text: '',
          };
        }
      } else {
        // Smart fallback: if public domain / free, generate valid Gutenberg or Open Library URL
        if (book.price === 0) {
          const safeSlug = encodeURIComponent(book.name.toLowerCase());
          updates.image = `https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=500&q=80`;
          updates.sourceUrl = `https://openlibrary.org/search?q=${safeSlug}`;
        }
      }

      if (Object.keys(updates).length > 0) {
        await Book.findByIdAndUpdate(book._id, { $set: updates });
        updatedCount++;
      }
    }

    console.log(`[Enrichment] Successfully enriched ${updatedCount} books with real covers, Gutenberg files, and Open Library links!`);
    await mongoose.disconnect();
    console.log("[Enrichment] Done.");
  } catch (err) {
    console.error("[Enrichment Error]", err);
  }
}

runEnrichment();
