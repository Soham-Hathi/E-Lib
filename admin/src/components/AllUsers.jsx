import axios from 'axios';
import { useState, useEffect } from 'react';

const AllUsers = () => {
  const [searchTerm, setSearchTerm] = useState(''); // State for search term
  const [users, setUsers] = useState([]); // Correct naming convention for array
  const token = localStorage.getItem('token');  // Assuming JWT is saved in localStorage

  useEffect(() => {
    const GetUser = async () => {
      try {
        const response = await axios.get('http://localhost:3000/user/getusers', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setUsers(response.data);
      } catch (error) {
        console.error('Error fetching users:', error);
      }
    };
    GetUser();
  }, [token]); // Adding token as a dependency

  // Make user admin
  const onMakeAdmin = async (id) => {
    try {
      // API call to update user as admin
      const response = await axios.put(
        `http://localhost:3000/user/updateuser/${id}`,
        { isAdmin: true },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert(response.data.message); // Show success message

      // Update users state directly without page reload
      setUsers(users.map(user => user._id === id ? { ...user, isAdmin: true } : user));
    } catch (error) {
      console.error("Error:", error.message);
      alert("Failed to update user. Please try again.");
    }
  };

  // Toggle user VIP Pro status
  const onToggleVip = async (id, isPro) => {
    try {
      const response = await axios.put(
        `http://localhost:3000/user/updateuser/${id}`,
        { isPro },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert(response.data.message || `VIP Pass updated to: ${isPro ? 'Active' : 'Inactive'}`);
      setUsers(users.map(user => user._id === id ? { ...user, isPro } : user));
    } catch (error) {
      console.error("VIP Toggle Error:", error.message);
      alert("Failed to update VIP status. Please try again.");
    }
  };

  // Delete user
  const onDelete = async (id) => {
    try {
      const response = await axios.delete(`http://localhost:3000/user/deleteuser/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert(response.data.message); // Show success message

      // Update users state directly after deletion
      setUsers(users.filter((user) => user._id !== id));
    } catch (error) {
      console.error("Error:", error.message);
      alert("Failed to delete user. Please try again.");
    }
  };

  // Filter users based on search term (by name)
  const filteredUsers = users.filter((user) =>
    user.fullname.toLowerCase().includes(searchTerm.toLowerCase()) || 
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      {/* Search Bar */}
      <div className="m-4">
        <input
          type="text"
          placeholder="Search users..." // Updated placeholder
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)} // Update search term
          className="w-full px-4 py-2 border rounded-lg"
        />
      </div>
      {filteredUsers.length > 0 ? (
        filteredUsers.map((user) => (
          <div className="m-4 flex items-center justify-between p-4 border-b border-gray-200 mx-10" key={user._id}>
            <div className="flex-1 inline-block">
              <h2 className="text-lg font-semibold dark:text-white">{user.fullname}</h2>
              <p className="text-sm text-gray-600 dark:text-white">{user.email}</p>
            </div>
            <div className="flex items-center justify-center mx-4 space-x-3">
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${user.isVerified ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200'}`}>
                {user.isVerified ? 'Verified' : 'Unverified'}
              </span>
              {user.isPro && (
                <span className="bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-950/60 dark:text-amber-200 text-xs px-2.5 py-1 rounded-full font-bold flex items-center gap-1 shadow-xs">
                  <span>👑</span> VIP Pass
                </span>
              )}
              <span className={`text-sm ${user.isAdmin ? 'text-green-500' : 'text-red-500'}`}>
                <span className="text-black font-bold dark:text-white">Role:</span> {user.isAdmin ? 'Admin' : 'User'}
              </span>
            </div>
            {user.isAdmin ? (
              <h2 className="font-bold text-xl dark:text-white">Admin Here</h2>
            ) : (
              <div className="flex space-x-2">
                <button
                  onClick={() => onToggleVip(user._id, !user.isPro)}
                  className={`px-3 py-1.5 rounded text-xs font-bold transition ${
                    user.isPro
                      ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200 border border-amber-400 hover:bg-amber-200'
                      : 'bg-amber-500 hover:bg-amber-600 text-white shadow-xs'
                  }`}
                  title={user.isPro ? 'Revoke VIP privileges' : 'Grant full VIP access'}
                >
                  {user.isPro ? 'Revoke VIP' : 'Grant VIP Pass'}
                </button>
                <button
                  onClick={() => onMakeAdmin(user._id)} // Pass user._id to onMakeAdmin
                  className="bg-blue-500 text-white px-3 py-1.5 rounded hover:bg-blue-600 text-xs font-semibold"
                >
                  Make Admin
                </button>
                <button
                  onClick={() => onDelete(user._id)} // Pass user._id to onDelete
                  className="bg-red-500 text-white px-3 py-1.5 rounded hover:bg-red-600 text-xs font-semibold"
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        ))
      ) : (
        <p className="text-gray-600 dark:text-white">No users found.</p>
      )}
    </>
  );
};

export default AllUsers;
