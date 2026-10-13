import { useState } from "react";
import axios from "axios";
import { API_BASE_URL } from "../config/api";

const UploadBook = () => {
  const [formData, setFormData] = useState({
    name: "",
    bookUrl: "",
    price: "",
    category: "",
    description: "",
    image: null,
  });

  const [message, setMessage] = useState("");

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (name === "image" && files && files[0]) {
      setFormData({ ...formData, image: files[0] });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.image && formData.image.size > 5 * 1024 * 1024) {
      setMessage("File size should be less than 5MB.");
      return;
    }

    const form = new FormData();
    form.append("name", formData.name);
    form.append("bookUrl", formData.bookUrl);
    form.append("price", formData.price);
    form.append("category", formData.category);
    form.append("description", formData.description);
    if (formData.image) {
      form.append("image", formData.image);
    }

    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(
        `${API_BASE_URL}/book/uploadbook`,
        form,
        {
          headers: {
            Authorization: `Bearer ${token}`, // ✅ Fixed syntax
            "Content-Type": "multipart/form-data",
          },
        }
      );

      console.log(response.data);
      setMessage("Book uploaded successfully!");
      setFormData({
        name: "",
        bookUrl: "",
        price: "",
        category: "",
        description: "",
        image: null,
      });

      // Reset file input field (clears chosen file)
      document.getElementById("image").value = "";
    } catch (error) {
      console.error("Error uploading the book:", error.response?.data || error.message);
      setMessage("Error uploading the book.");
    }
  };

  return (
    <div className="max-w-xl mx-auto mt-10 dark:bg-gray-700 p-10 w-full">
      <h2 className="text-2xl font-bold mb-5 dark:text-white">Upload a New Book</h2>
      {message && <p className="mb-4 text-blue-500">{message}</p>}
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2 dark:text-white" htmlFor="name">
            Book Name
          </label>
          <input id="name" name="name" type="text" value={formData.name} onChange={handleChange} className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" placeholder="Enter book name" required />
        </div>
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2 dark:text-white" htmlFor="bookUrl">
            Book URL
          </label>
          <input id="bookUrl" name="bookUrl" type="text" value={formData.bookUrl} onChange={handleChange} className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" placeholder="Enter book URL" required />
        </div>
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2 dark:text-white" htmlFor="price">
            Price
          </label>
          <input id="price" name="price" type="number" value={formData.price} onChange={handleChange} className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" placeholder="Enter price" required />
        </div>
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2 dark:text-white" htmlFor="category">
            Category
          </label>
          <input id="category" name="category" type="text" value={formData.category} onChange={handleChange} className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" placeholder="Enter category" required />
        </div>
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2 dark:text-white" htmlFor="description">
            Description
          </label>
          <input id="description" name="description" type="text" value={formData.description} onChange={handleChange} className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" placeholder="Enter description" required />
        </div>
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2 dark:text-white" htmlFor="image">
            Upload Image
          </label>
          <input id="image" name="image" type="file" onChange={handleChange} className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" required />
        </div>
        <button type="submit" className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline">
          Upload Book
        </button>
      </form>
    </div>
  );
};

export default UploadBook;
