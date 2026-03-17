/**
 * Split Group Controller - For expense splitting functionality
 * Handles group creation and management for expense sharing
 */
const SplitGroup = require('../models/splitGroupModel');
const SplitUser = require('../models/splitUserModel');
const asyncHandler = require('express-async-handler');

/**
 * @desc    Create a new expense splitting group
 * @route   POST /api/split/groups
 * @access  Private
 */
const createSplitGroup = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { name, icon, currency, description, members } = req.body;
  
  if (!name) {
    return res.status(400).json({
      success: false,
      message: 'Group name is required'
    });
  }
  
  // Find the current user's split profile
  const creatorSplitUser = await SplitUser.findOne({ userId });
  
  if (!creatorSplitUser) {
    return res.status(404).json({
      success: false,
      message: 'Your split user profile not found, please create one first'
    });
  }
  
  // Initialize group with creator as admin
  const groupData = {
    name,
    icon: icon || 'group',
    currency: currency || creatorSplitUser.defaultCurrency || 'USD',
    description: description || '',
    members: [
      {
        splitUser: creatorSplitUser._id,
        role: 'admin',
        joinedAt: Date.now()
      }
    ],
    createdBy: creatorSplitUser._id
  };
  
  // Add additional members if provided
  if (members && Array.isArray(members) && members.length > 0) {
    // Validate each member ID
    const validMembers = await Promise.all(members.map(async (memberId) => {
      const splitUser = await SplitUser.findById(memberId);
      if (splitUser && splitUser._id.toString() !== creatorSplitUser._id.toString()) {
        return {
          splitUser: splitUser._id,
          role: 'member',
          joinedAt: Date.now()
        };
      }
      return null;
    }));
    
    // Filter out null values and add valid members
    const filteredMembers = validMembers.filter(member => member !== null);
    groupData.members = [...groupData.members, ...filteredMembers];
  }
  
  // Create the group
  const group = await SplitGroup.create(groupData);
  
  // Populate member details for response
  const populatedGroup = await SplitGroup.findById(group._id)
    .populate({
      path: 'members.splitUser',
      select: '_id displayName email avatar'
    })
    .populate({
      path: 'createdBy',
      select: '_id displayName email avatar'
    });
  
  // Update recent contacts for all members
  for (const member of groupData.members) {
    if (member.splitUser.toString() !== creatorSplitUser._id.toString()) {
      // Add creator to member's recent contacts
      const memberSplitUser = await SplitUser.findById(member.splitUser);
      
      if (memberSplitUser) {
        // Check if creator is already in recent contacts
        const existingContactIndex = memberSplitUser.recentContacts.findIndex(
          contact => contact.splitUser.toString() === creatorSplitUser._id.toString()
        );
        
        if (existingContactIndex !== -1) {
          // Update the last interaction date
          memberSplitUser.recentContacts[existingContactIndex].lastInteractionDate = Date.now();
        } else {
          // Add to recent contacts
          memberSplitUser.recentContacts.push({
            splitUser: creatorSplitUser._id,
            lastInteractionDate: Date.now()
          });
        }
        
        await memberSplitUser.save();
      }
      
      // Add member to creator's recent contacts
      const existingContactIndex = creatorSplitUser.recentContacts.findIndex(
        contact => contact.splitUser.toString() === member.splitUser.toString()
      );
      
      if (existingContactIndex !== -1) {
        // Update the last interaction date
        creatorSplitUser.recentContacts[existingContactIndex].lastInteractionDate = Date.now();
      } else {
        // Add to recent contacts
        creatorSplitUser.recentContacts.push({
          splitUser: member.splitUser,
          lastInteractionDate: Date.now()
        });
      }
    }
  }
  
  // Save creator's updated recent contacts
  await creatorSplitUser.save();
  
  res.status(201).json({
    success: true,
    message: 'Group created successfully',
    data: populatedGroup
  });
});

/**
 * @desc    Get all groups for a user
 * @route   GET /api/split/groups
 * @access  Private
 */
const getSplitGroups = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  
  // Find the current user's split profile
  const splitUser = await SplitUser.findOne({ userId });
  
  if (!splitUser) {
    return res.status(404).json({
      success: false,
      message: 'Split user profile not found'
    });
  }
  
  // Find all groups where the user is a member
  const groups = await SplitGroup.find({
    'members.splitUser': splitUser._id,
    isActive: true
  })
    .populate({
      path: 'members.splitUser',
      select: '_id displayName email avatar'
    })
    .populate({
      path: 'createdBy',
      select: '_id displayName email avatar'
    })
    .sort({ updatedAt: -1 });
  
  res.status(200).json({
    success: true,
    count: groups.length,
    data: groups
  });
});

/**
 * @desc    Get a specific group
 * @route   GET /api/split/groups/:id
 * @access  Private
 */
const getSplitGroup = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user._id;
  
  // Find the current user's split profile
  const splitUser = await SplitUser.findOne({ userId });
  
  if (!splitUser) {
    return res.status(404).json({
      success: false,
      message: 'Split user profile not found'
    });
  }
  
  // Find the group and verify user membership
  const group = await SplitGroup.findOne({
    _id: id,
    'members.splitUser': splitUser._id,
    isActive: true
  })
    .populate({
      path: 'members.splitUser',
      select: '_id displayName email avatar'
    })
    .populate({
      path: 'createdBy',
      select: '_id displayName email avatar'
    });
  
  if (!group) {
    return res.status(404).json({
      success: false,
      message: 'Group not found or you are not a member'
    });
  }
  
  res.status(200).json({
    success: true,
    data: group
  });
});

/**
 * @desc    Update a group
 * @route   PUT /api/split/groups/:id
 * @access  Private (Admin only)
 */
const updateSplitGroup = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user._id;
  const { name, icon, currency, description } = req.body;
  
  // Find the current user's split profile
  const splitUser = await SplitUser.findOne({ userId });
  
  if (!splitUser) {
    return res.status(404).json({
      success: false,
      message: 'Split user profile not found'
    });
  }
  
  // Find the group
  let group = await SplitGroup.findById(id);
  
  if (!group) {
    return res.status(404).json({
      success: false,
      message: 'Group not found'
    });
  }
  
  // Check if user is an admin
  const isAdmin = group.members.some(
    member => 
      member.splitUser.toString() === splitUser._id.toString() && 
      member.role === 'admin'
  );
  
  if (!isAdmin) {
    return res.status(403).json({
      success: false,
      message: 'Only group admins can update the group'
    });
  }
  
  // Update fields
  if (name) group.name = name;
  if (icon) group.icon = icon;
  if (currency) group.currency = currency;
  if (description !== undefined) group.description = description;
  
  group.updatedAt = Date.now();
  
  await group.save();
  
  // Get updated group with populated data
  const updatedGroup = await SplitGroup.findById(id)
    .populate({
      path: 'members.splitUser',
      select: '_id displayName email avatar'
    })
    .populate({
      path: 'createdBy',
      select: '_id displayName email avatar'
    });
  
  res.status(200).json({
    success: true,
    message: 'Group updated successfully',
    data: updatedGroup
  });
});

/**
 * @desc    Add members to a group
 * @route   POST /api/split/groups/:id/members
 * @access  Private (Admin only)
 */
const addGroupMembers = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user._id;
  const { members } = req.body;
  
  if (!members || !Array.isArray(members) || members.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Members array is required'
    });
  }
  
  // Find the current user's split profile
  const splitUser = await SplitUser.findOne({ userId });
  
  if (!splitUser) {
    return res.status(404).json({
      success: false,
      message: 'Split user profile not found'
    });
  }
  
  // Find the group
  let group = await SplitGroup.findById(id);
  
  if (!group) {
    return res.status(404).json({
      success: false,
      message: 'Group not found'
    });
  }
  
  // Check if user is an admin
  const isAdmin = group.members.some(
    member => 
      member.splitUser.toString() === splitUser._id.toString() && 
      member.role === 'admin'
  );
  
  if (!isAdmin) {
    return res.status(403).json({
      success: false,
      message: 'Only group admins can add members'
    });
  }
  
  // Get existing member IDs
  const existingMemberIds = group.members.map(member => member.splitUser.toString());
  
  // Validate and add new members
  const membersToAdd = [];
  for (const memberId of members) {
    // Skip if already a member
    if (existingMemberIds.includes(memberId)) {
      continue;
    }
    
    // Validate member exists
    const memberSplitUser = await SplitUser.findById(memberId);
    if (memberSplitUser) {
      membersToAdd.push({
        splitUser: memberSplitUser._id,
        role: 'member',
        joinedAt: Date.now()
      });
      
      // Update recent contacts for both users
      // Add new member to admin's recent contacts
      const existingContactIndex = splitUser.recentContacts.findIndex(
        contact => contact.splitUser.toString() === memberId
      );
      
      if (existingContactIndex !== -1) {
        // Update the last interaction date
        splitUser.recentContacts[existingContactIndex].lastInteractionDate = Date.now();
      } else {
        // Add to recent contacts
        splitUser.recentContacts.push({
          splitUser: memberId,
          lastInteractionDate: Date.now()
        });
      }
      
      // Add admin to new member's recent contacts
      const memberContactIndex = memberSplitUser.recentContacts.findIndex(
        contact => contact.splitUser.toString() === splitUser._id.toString()
      );
      
      if (memberContactIndex !== -1) {
        // Update the last interaction date
        memberSplitUser.recentContacts[memberContactIndex].lastInteractionDate = Date.now();
      } else {
        // Add to recent contacts
        memberSplitUser.recentContacts.push({
          splitUser: splitUser._id,
          lastInteractionDate: Date.now()
        });
      }
      
      await memberSplitUser.save();
    }
  }
  
  // Save admin's updated recent contacts
  await splitUser.save();
  
  // Add new members to the group
  if (membersToAdd.length > 0) {
    group.members = [...group.members, ...membersToAdd];
    group.updatedAt = Date.now();
    await group.save();
  }
  
  // Get updated group with populated data
  const updatedGroup = await SplitGroup.findById(id)
    .populate({
      path: 'members.splitUser',
      select: '_id displayName email avatar'
    })
    .populate({
      path: 'createdBy',
      select: '_id displayName email avatar'
    });
  
  res.status(200).json({
    success: true,
    message: `${membersToAdd.length} new members added to the group`,
    data: updatedGroup
  });
});

/**
 * @desc    Remove a member from a group
 * @route   DELETE /api/split/groups/:id/members/:memberId
 * @access  Private (Admin only, or self-removal)
 */
const removeGroupMember = asyncHandler(async (req, res) => {
  const { id, memberId } = req.params;
  const userId = req.user._id;
  
  // Find the current user's split profile
  const splitUser = await SplitUser.findOne({ userId });
  
  if (!splitUser) {
    return res.status(404).json({
      success: false,
      message: 'Split user profile not found'
    });
  }
  
  // Find the group
  let group = await SplitGroup.findById(id);
  
  if (!group) {
    return res.status(404).json({
      success: false,
      message: 'Group not found'
    });
  }
  
  // Check if user is an admin or is removing themselves
  const isAdmin = group.members.some(
    member => 
      member.splitUser.toString() === splitUser._id.toString() && 
      member.role === 'admin'
  );
  
  const isSelfRemoval = splitUser._id.toString() === memberId;
  
  if (!isAdmin && !isSelfRemoval) {
    return res.status(403).json({
      success: false,
      message: 'Only group admins can remove members, or you can remove yourself'
    });
  }
  
  // Prevent removal of the last admin
  if (
    isAdmin && 
    memberId === splitUser._id.toString() && 
    group.members.filter(m => m.role === 'admin').length === 1
  ) {
    return res.status(400).json({
      success: false,
      message: 'Cannot remove the last admin. Transfer admin rights first'
    });
  }
  
  // Remove the member
  group.members = group.members.filter(
    member => member.splitUser.toString() !== memberId
  );
  
  // If no members left, deactivate the group
  if (group.members.length === 0) {
    group.isActive = false;
  }
  
  group.updatedAt = Date.now();
  await group.save();
  
  // Get updated group with populated data
  const updatedGroup = await SplitGroup.findById(id)
    .populate({
      path: 'members.splitUser',
      select: '_id displayName email avatar'
    })
    .populate({
      path: 'createdBy',
      select: '_id displayName email avatar'
    });
  
  res.status(200).json({
    success: true,
    message: 'Member removed from the group',
    data: updatedGroup
  });
});

/**
 * @desc    Change a member's role (promote/demote)
 * @route   PUT /api/split/groups/:id/members/:memberId/role
 * @access  Private (Admin only)
 */
const updateMemberRole = asyncHandler(async (req, res) => {
  const { id, memberId } = req.params;
  const userId = req.user._id;
  const { role } = req.body;
  
  if (!role || !['admin', 'member'].includes(role)) {
    return res.status(400).json({
      success: false,
      message: 'Valid role (admin or member) is required'
    });
  }
  
  // Find the current user's split profile
  const splitUser = await SplitUser.findOne({ userId });
  
  if (!splitUser) {
    return res.status(404).json({
      success: false,
      message: 'Split user profile not found'
    });
  }
  
  // Find the group
  let group = await SplitGroup.findById(id);
  
  if (!group) {
    return res.status(404).json({
      success: false,
      message: 'Group not found'
    });
  }
  
  // Check if user is an admin
  const isAdmin = group.members.some(
    member => 
      member.splitUser.toString() === splitUser._id.toString() && 
      member.role === 'admin'
  );
  
  if (!isAdmin) {
    return res.status(403).json({
      success: false,
      message: 'Only group admins can change member roles'
    });
  }
  
  // Find the member to update
  const memberIndex = group.members.findIndex(
    member => member.splitUser.toString() === memberId
  );
  
  if (memberIndex === -1) {
    return res.status(404).json({
      success: false,
      message: 'Member not found in the group'
    });
  }
  
  // Prevent demoting the last admin
  if (
    role === 'member' && 
    group.members[memberIndex].role === 'admin' && 
    group.members.filter(m => m.role === 'admin').length === 1
  ) {
    return res.status(400).json({
      success: false,
      message: 'Cannot demote the last admin'
    });
  }
  
  // Update the role
  group.members[memberIndex].role = role;
  group.updatedAt = Date.now();
  await group.save();
  
  // Get updated group with populated data
  const updatedGroup = await SplitGroup.findById(id)
    .populate({
      path: 'members.splitUser',
      select: '_id displayName email avatar'
    })
    .populate({
      path: 'createdBy',
      select: '_id displayName email avatar'
    });
  
  res.status(200).json({
    success: true,
    message: `Member role updated to ${role}`,
    data: updatedGroup
  });
});

/**
 * @desc    Delete/archive a group
 * @route   DELETE /api/split/groups/:id
 * @access  Private (Admin only)
 */
const deleteSplitGroup = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user._id;
  
  // Find the current user's split profile
  const splitUser = await SplitUser.findOne({ userId });
  
  if (!splitUser) {
    return res.status(404).json({
      success: false,
      message: 'Split user profile not found'
    });
  }
  
  // Find the group
  let group = await SplitGroup.findById(id);
  
  if (!group) {
    return res.status(404).json({
      success: false,
      message: 'Group not found'
    });
  }
  
  // Check if user is an admin
  const isAdmin = group.members.some(
    member => 
      member.splitUser.toString() === splitUser._id.toString() && 
      member.role === 'admin'
  );
  
  if (!isAdmin) {
    return res.status(403).json({
      success: false,
      message: 'Only group admins can delete the group'
    });
  }
  
  // Soft delete by marking as inactive
  group.isActive = false;
  group.updatedAt = Date.now();
  await group.save();
  
  res.status(200).json({
    success: true,
    message: 'Group deleted successfully'
  });
});

module.exports = {
  createSplitGroup,
  getSplitGroups,
  getSplitGroup,
  updateSplitGroup,
  addGroupMembers,
  removeGroupMember,
  updateMemberRole,
  deleteSplitGroup
};
