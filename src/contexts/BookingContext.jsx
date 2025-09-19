import React, { createContext, useContext, useState, useReducer, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';

const BookingContext = createContext();

// Booking reducer để quản lý state
const bookingReducer = (state, action) => {
  switch (action.type) {
    case 'SET_HOUSEKEEPER':
      return {
        ...state,
        selectedHousekeeper: action.payload
      };
    
    case 'SET_BOOKING_DETAILS':
      return {
        ...state,
        bookingDetails: {
          ...state.bookingDetails,
          ...action.payload
        }
      };
    
    case 'SET_BOOKING_STAGE':
      return {
        ...state,
        currentStage: action.payload
      };
    
    case 'SET_BOOKING_STATUS':
      return {
        ...state,
        status: action.payload
      };
    
    case 'SET_BOOKING_ID':
      return {
        ...state,
        bookingId: action.payload
      };
    
    case 'RESET_BOOKING':
      return getDefaultState();
    
    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload
      };
    
    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null
      };
    
    default:
      return state;
  }
};

// Load initial state from localStorage if available
const loadInitialState = () => {
  try {
    const savedState = localStorage.getItem('bookingState');
    if (savedState) {
      const parsed = JSON.parse(savedState);
      console.log('Loaded booking state from localStorage:', parsed);
      
      // Always start fresh if no bookingId (means no actual booking was made)
      if (!parsed.bookingId) {
        console.log('No booking ID found, starting with fresh state');
        localStorage.removeItem('bookingState');
        return getDefaultState();
      }
      
      return parsed;
    }
  } catch (error) {
    console.error('Error loading booking state:', error);
    localStorage.removeItem('bookingState'); // Clear corrupted state
  }
  
  return getDefaultState();
};

// Default state function
const getDefaultState = () => ({
  selectedHousekeeper: null,
  bookingDetails: {
    service: '',
    date: '',
    time: '',
    duration: 2,
    location: '',
    notes: '',
    totalPrice: 0
  },
  currentStage: 'details', // details, processing, completed
  status: 'pending', // pending, confirmed, in_progress, completed, cancelled
  bookingId: null,
  error: null
});

// Initial state
const initialBookingState = loadInitialState();

export const BookingProvider = ({ children }) => {
  // const { user } = useAuth(); // Get current user - Comment out to avoid router dependency
  const [state, dispatch] = useReducer(bookingReducer, initialBookingState);
  const [bookingHistory, setBookingHistory] = useState([]);

  // Save state to localStorage whenever state changes
  useEffect(() => {
    try {
      localStorage.setItem('bookingState', JSON.stringify(state));
      console.log('Saved booking state to localStorage:', state);
    } catch (error) {
      console.error('Error saving booking state:', error);
    }
  }, [state]);

  // Action creators
  const setHousekeeper = (housekeeper) => {
    dispatch({ type: 'SET_HOUSEKEEPER', payload: housekeeper });
  };

  const setBookingDetails = (details) => {
    dispatch({ type: 'SET_BOOKING_DETAILS', payload: details });
  };

  const setBookingStage = (stage) => {
    dispatch({ type: 'SET_BOOKING_STAGE', payload: stage });
  };

  const setBookingStatus = (status) => {
    dispatch({ type: 'SET_BOOKING_STATUS', payload: status });
  };

  const setBookingId = (id) => {
    dispatch({ type: 'SET_BOOKING_ID', payload: id });
  };

  const resetBooking = () => {
    dispatch({ type: 'RESET_BOOKING' });
    // Clear localStorage when resetting
    try {
      localStorage.removeItem('bookingState');
      console.log('Cleared booking state from localStorage');
    } catch (error) {
      console.error('Error clearing booking state:', error);
    }
  };

  const clearBookingState = () => {
    console.log('Clearing booking state and localStorage...');
    
    // Clear localStorage first
    try {
      localStorage.removeItem('bookingState');
      console.log('Cleared booking state from localStorage');
    } catch (error) {
      console.error('Error clearing booking state:', error);
    }
    
    // Reset to default state
    dispatch({ type: 'RESET_BOOKING' });
    
    // Force set to details stage to ensure form shows
    setTimeout(() => {
      dispatch({ type: 'SET_BOOKING_STAGE', payload: 'details' });
      console.log('Force set booking stage to details');
    }, 100);
  };

  const setError = (error) => {
    dispatch({ type: 'SET_ERROR', payload: error });
  };

  const clearError = () => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  // Calculate total price
  const calculateTotalPrice = (details, housekeeper) => {
    if (!housekeeper || !details.duration) return 0;
    
    const basePrice = housekeeper.price * details.duration;
    const platformFee = 5.00;
    const serviceFee = 5.00;
    
    return basePrice + platformFee + serviceFee;
  };

  // Create booking
  const createBooking = async (bookingData) => {
    try {
      setError(null);

      // Generate booking ID
      const bookingId = `BK-${Date.now().toString().slice(-6)}`;
      setBookingId(bookingId);

      const newBooking = {
        ...bookingData,
        id: bookingId,
        housekeeperId: state.selectedHousekeeper?.id,
        housekeeperName: state.selectedHousekeeper?.fullName,
        status: 'pending',
        createdAt: new Date().toISOString(),
        totalPrice: calculateTotalPrice(bookingData, state.selectedHousekeeper)
      };

      // Set booking details first
      setBookingDetails(newBooking);
      
      // Call real API để tạo booking
      try {
        const response = await fetch('http://localhost:5000/api/bookings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            customerId: bookingData.customerId || 4, // Use provided customer ID or fallback
            housekeeperId: state.selectedHousekeeper?.id,
            service: bookingData.service,
            date: bookingData.date,
            time: bookingData.time,
            duration: bookingData.duration,
            location: bookingData.location,
            notes: bookingData.notes,
            totalPrice: newBooking.totalPrice,
            customerName: bookingData.customerName,
            customerEmail: bookingData.customerEmail,
            customerPhone: bookingData.customerPhone,
            housekeeperName: state.selectedHousekeeper?.fullName
          })
        });

        if (response.ok) {
          const apiBooking = await response.json();
          // Update with real API booking ID
          setBookingId(apiBooking.id);
          newBooking.id = apiBooking.id; // Update the local object too
        }
      } catch (apiError) {
        console.error('API call failed, using local booking:', apiError);
      }

      // Update booking history
      setBookingHistory(prev => [newBooking, ...prev]);
      
      // Update final booking details and status
      setBookingDetails(newBooking);
      setBookingStatus('pending');

      // Set to pending state to wait for housekeeper confirmation - LAST
      console.log('Setting booking stage to pending');
      setBookingStage('pending');

      return newBooking;
    } catch (error) {
      setError(error.message || 'Failed to create booking');
      setBookingStage('details');
      throw error;
    }
  };

  // Cancel booking
  const cancelBooking = async (bookingId) => {
    try {
      setError(null);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Update booking history
      setBookingHistory(prev => 
        prev.map(booking => 
          booking.id === bookingId 
            ? { ...booking, status: 'cancelled' }
            : booking
        )
      );
      
      if (state.bookingId === bookingId) {
        setBookingStatus('cancelled');
      }
      
      return true;
    } catch (error) {
      setError(error.message || 'Failed to cancel booking');
      throw error;
    }
  };

  // Get booking by ID
  const getBookingById = (bookingId) => {
    return bookingHistory.find(booking => booking.id === bookingId);
  };

  // Get user's booking history
  const getUserBookings = () => {
    return bookingHistory.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  };

  const value = {
    // State
    ...state,
    bookingHistory,
    
    // Actions
    setHousekeeper,
    setBookingDetails,
    setBookingStage,
    setBookingStatus,
    setBookingId,
    resetBooking,
    clearBookingState,
    setError,
    clearError,
    
    // Methods
    calculateTotalPrice,
    createBooking,
    cancelBooking,
    getBookingById,
    getUserBookings
  };

  return (
    <BookingContext.Provider value={value}>
      {children}
    </BookingContext.Provider>
  );
};

export const useBooking = () => {
  const context = useContext(BookingContext);
  if (!context) {
    throw new Error('useBooking must be used within a BookingProvider');
  }
  return context;
};

export default BookingContext;

