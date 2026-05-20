import Book from "./models/book.model.js";

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const fallbackBooks = [
  {
    name: "The Great Gatsby",
    price: 0,
    category: "Fiction",
    image: "https://images.unsplash.com/photo-1543002588-bfa74002ed7e?q=80&w=300",
    description: "A 1925 novel by American writer F. Scott Fitzgerald. Set in the Jazz Age on Long Island, near New York City."
  },
  {
    name: "Clean Code",
    price: 350,
    category: "Programming",
    image: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?q=80&w=300",
    description: "A Handbook of Agile Software Craftsmanship by Robert C. Martin. Learn how to write code that is clean, readable, and maintainable."
  },
  {
    name: "Sapiens: A Brief History of Humankind",
    price: 0,
    category: "History",
    image: "https://images.unsplash.com/photo-1447069387593-a5de0862481e?q=80&w=300",
    description: "A book by Yuval Noah Harari, first published in Hebrew in Israel in 2011, and in English in 2014."
  },
  {
    name: "JavaScript: The Good Parts",
    price: 250,
    category: "Programming",
    image: "https://images.unsplash.com/photo-1579468118864-1b9ea3c0db4a?q=80&w=300",
    description: "Unlocking the most beautiful, elegant, and powerful parts of the JavaScript language by Douglas Crockford."
  },
  {
    name: "Dune",
    price: 450,
    category: "Fiction",
    image: "https://images.unsplash.com/photo-1532012197267-da84d127e765?q=80&w=300",
    description: "Frank Herbert's classic science fiction masterpiece, set in the far future amidst a sprawling feudal interstellar empire."
  },
  {
    name: "A Brief History of Time",
    price: 0,
    category: "Science",
    image: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=300",
    description: "Stephen Hawking's landmark book about cosmology, space, time, black holes, and the origin of the universe."
  }
];

export const seedBooksFromAPI = async () => {
  try {
    console.log("Dropping existing books to re-seed with the new massive book collection...");
    await Book.deleteMany({});
    
    console.log("Database cleared. Populating with many books from Google Books API...");
      
      const categories = ['fiction', 'science', 'programming', 'history', 'romance', 'technology', 'design'];
      const allBooksToInsert = [];

      for (const category of categories) {
        try {
          console.log(`Fetching books for category: ${category}...`);
          const response = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${category}&maxResults=20`);
          
          if (!response.ok) {
            console.warn(`Failed to fetch for category ${category}: ${response.status} ${response.statusText}`);
            continue;
          }

          const data = await response.json();

          if (data.items) {
            data.items.forEach((item, index) => {
              const info = item.volumeInfo;
              
              // Randomly assign as Free or Paid
              const isFree = Math.random() > 0.5;
              const price = isFree ? 0 : Math.floor(Math.random() * 400) + 100; // Paid books between Rs 100 and Rs 500

              let image = "https://via.placeholder.com/150";
              if (info.imageLinks && info.imageLinks.thumbnail) {
                 image = info.imageLinks.thumbnail.replace(/^http:\/\//i, 'https://');
              }

              let description = info.description || `A fantastic read titled "${info.title || 'Unknown Title'}".`;
              if (description.length > 500) {
                 description = description.substring(0, 500) + "...";
              }

              allBooksToInsert.push({
                name: info.title || "Unknown Title",
                price: price,
                category: (info.categories && info.categories.length > 0) ? info.categories[0] : category,
                image: image,
                description: description,
              });
            });
          }
        } catch (apiError) {
          console.warn(`Error querying category ${category}:`, apiError.message);
        }
        
        // Wait 1.5 seconds to prevent Google API rate limit (429)
        await delay(1500);
      }

      if (allBooksToInsert.length === 0) {
        console.log("Google Books API was rate-limited or failed. Seeding fallback local books instead...");
        await Book.insertMany(fallbackBooks);
        console.log(`Successfully seeded ${fallbackBooks.length} fallback books!`);
      } else {
        await Book.insertMany(allBooksToInsert);
        console.log(`Successfully seeded ${allBooksToInsert.length} books from Google Books API! (Varied Free & Paid categories)`);
      }
  } catch (error) {
    console.error("Error seeding database: ", error.message);
  }
};
