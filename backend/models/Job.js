const mongoose = require('mongoose');

const normalizeSalaryAmount = (value) => {
    if (value === undefined || value === null || value === '') return value;

    const numericValue = Number(String(value).replace(/[^\d.-]/g, ''));
    if (!Number.isFinite(numericValue)) return value;

    const roundedValue = Math.round(numericValue);

    if (roundedValue >= 1000 && roundedValue % 1000 === 998) {
        return roundedValue + 2;
    }

    return roundedValue;
};

const jobSchema = new mongoose.Schema({
    status: {
        type: String,
        enum: ['draft', 'published', 'filled', 'closed'],
        default: 'published'
    },

    title: {
        type: String,
        required: function () { return this.isPublished === true; },
        trim: true
    },
    description: {
        type: String,
        required: function () { return this.isPublished === true; }
    },
    requirements: {
        type: String,
        required: function () { return this.isPublished === true; }
    },
    jobType: {
        type: String,
        enum: [
            'All Employment Types',
            'Full-time',
            'Part-time',
            'Contractual',
            'Permanent'
        ],
        required: function () { return this.isPublished === true; }
    },

    educationLevel: {
        type: String,
        enum: [
            "Bachelor’s / College degree graduate's",
            'Master’s degree',
            'Doctorate Degree',
            "Bachelor / College degree graduate's",
            'Master degree',
            'Doctorate degree'
        ],
        required: function () { return this.isPublished === true; }
    },

    category: {
        type: String,
        required: function () { return this.isPublished === true; },
        default: 'Others',
        trim: true
    },

    salaryMin: {
        type: Number,
        min: 0,
        set: normalizeSalaryAmount
    },
    salaryMax: {
        type: Number,
        min: 0,
        set: normalizeSalaryAmount
    },
    hideSalary: {
        type: Boolean,
        default: false
    },
    isUrgent: {
        type: Boolean,
        default: false
    },
    location: {
        type: String,
        required: function () { return this.isPublished === true; }
    },
    locationProvince: {
        type: String,
        trim: true,
        default: ''
    },
    locationCity: {
        type: String,
        trim: true,
        default: ''
    },
    workMode: {
        type: String,
        enum: ['On-site', 'Remote', 'Blended', 'Work from Home'],
        required: function () { return this.isPublished === true; }
    },
    applicationDeadline: {
        type: Date,
        required: function () { return this.isPublished === true; }
    },
    vacancies: {
        type: Number,
        required: function () { return this.isPublished === true; },
        min: 1
    },
    skillsRequired: [{
        type: String,
        trim: true
    }],

    experienceLevel: {
        type: String,
        enum: [
            'No experience required',
            'Less than 1 Yr',
            '1-3 Years',
            '4-5 years',
            '6+ Years',
            // Legacy values are retained so existing job records remain valid.
            '1 year',
            '2 year',
            '3 year',
            '4 year',
            '5 year',
            '6+ year',
            '2 years',
            '3 years',
            '4 years',
            '5 years',
            '6+ years',
        ],
        default: 'No experience required'
    },

    openToFreshGraduates: {
        type: Boolean,
        default: false
    },
    perksAndBenefits: [{
        type: String,
        trim: true
    }],
    otherBenefits: {
        type: String,
        trim: true,
        default: ''
    },
    willingToRelocate: {
        type: String,
        enum: [
          'Yes - willing to relocate',
          'No - position is fixed location',
          'Open to relocation if necessary',
        ],
        default: 'No - position is fixed location'
    },
    locationImage: {
        type: String,
        default: ''
    },
    locationLatitude: {
        type: Number,
        default: null
    },
    locationLongitude: {
        type: Number,
        default: null
    },

    employer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    companyName: {
        type: String,
        required: true
    },
    companyLogo: {
        type: String,
        default: ''
    },
    isActive: {
        type: Boolean,
        default: true
    },

    isPublished: {
        type: Boolean,
        default: true
    },

    isArchived: {
        type: Boolean,
        default: false
    },

    archivedAt: {
        type: Date,
        default: null
    },

    views: {
        type: Number,
        default: 0
    },
    applications: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Application'
    }],
    applicationCount: {
        type: Number,
        default: 0
    },
    filledAt: {
        type: Date,
        default: null
    },
    filledReason: {
        type: String,
        default: '',
        trim: true
    }
}, {
    timestamps: true
});

jobSchema.index({ title: 'text', description: 'text', category: 'text' });
jobSchema.index({ employer: 1, createdAt: -1 });
jobSchema.index({ isActive: 1, isPublished: 1 });
jobSchema.index({ employer: 1, isArchived: 1, createdAt: -1 });

module.exports = mongoose.model('Job', jobSchema);