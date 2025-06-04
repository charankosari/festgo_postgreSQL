const Property = require('../models/propertyModel');
const Merchant = require('../models/merchantModel');
// Create new property
exports.createProperty = async (req, res) => {
  try {
    const propertyData = req.body;
    const merchantId = req.merchant.id; // From isAuthorized middleware

    // Attach the merchantId to the property data
    const merchant = await Merchant.findById(merchantId);
    if (!merchant || !merchant.is_authorized) {
      return res.status(403).json({ error: "Merchant is not authorized to create properties." });
    }

    propertyData.merchant = merchantId;
    const totalSteps = 7;
    const currentStep = propertyData.current_step || 0; // Use provided step or default to 0
    propertyData.status = Math.min(Math.round((currentStep / totalSteps) * 100), 100);

    // Set in_progress and is_completed based on current_step
    if (currentStep >= totalSteps) {
      propertyData.in_progress = false;
      propertyData.is_completed = true;
    } else {
      propertyData.in_progress = true;
      propertyData.is_completed = false;
    }
    // Create new property
    const property = new Property(propertyData);
    await property.save();

    // Add this property to merchant's properties array
    await Merchant.findByIdAndUpdate(
      merchantId,
      { $push: { properties: property._id } },
      { new: true }
    );

    res.status(201).json({
      message: "Property created and added to merchant successfully",
      property
    });
  } catch (error) {
    console.error("Error creating property:", error);
    res.status(500).json({ error: "Failed to create property" });
  }
};
// Get all properties
exports.getAllProperties = async (req, res) => {
  try {
    const properties = await Property.find();

    res.status(200).json(properties);
  } catch (error) {
    console.error('Error fetching properties:', error);
    res.status(500).json({ error: 'Failed to fetch properties' });
  }
};

// Get property by ID
exports.getPropertyById = async (req, res) => {
  try {
    const { id } = req.params;
    const property = await Property.findById(id);

    if (!property) {
      return res.status(404).json({ error: 'Property not found' });
    }

    res.status(200).json(property);
  } catch (error) {
    console.error('Error fetching property:', error);
    res.status(500).json({ error: 'Failed to fetch property' });
  }
};

// Update property
exports.updateProperty = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedData = req.body;
    if (updatedData.current_step !== undefined) {
      const totalSteps = 7;
      const currentStep = updatedData.current_step;
      updatedData.status = Math.min(Math.round((currentStep / totalSteps) * 100), 100);

      if (currentStep >= totalSteps) {
        updatedData.in_progress = false;
        updatedData.is_completed = true;
      } else {
        updatedData.in_progress = true;
        updatedData.is_completed = false;
      }
    }
    const updatedProperty = await Property.findByIdAndUpdate(id, updatedData, {
      new: true,
      runValidators: true
    });

    if (!updatedProperty) {
      return res.status(404).json({ error: 'Property not found' });
    }

    res.status(200).json({
      message: 'Property updated successfully',
      property: updatedProperty
    });
  } catch (error) {
    console.error('Error updating property:', error);
    res.status(500).json({ error: 'Failed to update property' });
  }
};

// Delete property
exports.deleteProperty = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedProperty = await Property.findByIdAndDelete(id);

    if (!deletedProperty) {
      return res.status(404).json({ error: 'Property not found' });
    }

    res.status(200).json({ message: 'Property deleted successfully' });
  } catch (error) {
    console.error('Error deleting property:', error);
    res.status(500).json({ error: 'Failed to delete property' });
  }
};
