import { createContext, useContext, useState, useEffect } from 'react';

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState(() => {
    try {
      const savedCart = localStorage.getItem('BookStore_Cart');
      return savedCart ? JSON.parse(savedCart) : [];
    } catch {
      return [];
    }
  });

  // Sync to localStorage on every update
  useEffect(() => {
    try {
      localStorage.setItem('BookStore_Cart', JSON.stringify(cartItems));
    } catch (err) {
      console.error('Failed to persist cart items:', err);
    }
  }, [cartItems]);

  const addToCart = (book, quantity = 1) => {
    if (!book || !book._id) return;

    setCartItems((prevItems) => {
      const existingIndex = prevItems.findIndex((item) => item._id === book._id);
      if (existingIndex > -1) {
        // Increment quantity
        const updated = [...prevItems];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + quantity,
        };
        return updated;
      } else {
        // Add new item
        return [
          ...prevItems,
          {
            _id: book._id,
            name: book.name || book.title || 'Untitled Book',
            price: Number(book.price) || 0,
            image: book.image || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400',
            category: book.category || 'General',
            quantity: Math.max(1, quantity),
          },
        ];
      }
    });
  };

  const removeFromCart = (bookId) => {
    setCartItems((prevItems) => prevItems.filter((item) => item._id !== bookId));
  };

  const updateQuantity = (bookId, newQuantity) => {
    const qty = Math.max(1, parseInt(newQuantity, 10) || 1);
    setCartItems((prevItems) =>
      prevItems.map((item) =>
        item._id === bookId ? { ...item, quantity: qty } : item
      )
    );
  };

  const clearCart = () => {
    setCartItems([]);
  };

  const getCartCount = () => {
    return cartItems.reduce((total, item) => total + (item.quantity || 1), 0);
  };

  const getCartSubtotal = () => {
    return cartItems.reduce(
      (total, item) => total + (item.price || 0) * (item.quantity || 1),
      0
    );
  };

  return (
    <CartContext.Provider
      value={{
        cartItems,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        getCartCount,
        getCartSubtotal,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
