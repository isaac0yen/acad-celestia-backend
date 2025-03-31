const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  regNumber: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false,
    field: 'reg_number'
  },
  nin: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false
  },
  surname: {
    type: DataTypes.STRING,
    allowNull: false
  },
  firstName: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'first_name'
  },
  middleName: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'middle_name'
  },
  dateOfBirth: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'date_of_birth'
  },
  gender: {
    type: DataTypes.STRING,
    allowNull: false
  },
  stateOfOrigin: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'state_of_origin'
  },
  lgaOfOrigin: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'lga_of_origin'
  },
  admissionYear: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'admission_year'
  },
  institution: {
    type: DataTypes.STRING,
    allowNull: false
  },
  institutionCode: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'institution_code'
  },
  course: {
    type: DataTypes.STRING,
    allowNull: false
  },
  courseCode: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'course_code'
  },
  admissionType: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'admission_type'
  },
  profilePicture: {
    type: DataTypes.BLOB,
    allowNull: true,
    field: 'profile_picture'
  },
  requestId: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false,
    field: 'request_id'
  },
  userType: {
    type: DataTypes.ENUM('student', 'admin'),
    defaultValue: 'student',
    field: 'user_type'
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'created_at'
  },
  updatedAt: {
    type: DataTypes.DATE,
    field: 'updated_at'
  }
}, {
  tableName: 'users',
  timestamps: true
});

module.exports = User;
