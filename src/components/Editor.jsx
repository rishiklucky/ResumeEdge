import React, { useState, useEffect } from 'react';

const SectionTitleInput = ({ initialValue, onSave }) => {
    const [value, setValue] = useState(initialValue);

    useEffect(() => {
        setValue(initialValue);
    }, [initialValue]);

    return (
        <input
            className="section-title-edit"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onBlur={() => onSave(value)}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
                if (e.key === 'Enter') {
                    e.target.blur();
                }
            }}
            title="Click to edit section name. Press Enter to save."
        />
    );
};

const SectionHeader = ({ id, title, isOpen, onClick, hideReorder, index, updateSectionLabel, moveSection, removeSection, resumeDataLength }) => (
    <div className="section-header" onClick={onClick}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
            {!hideReorder ? (
                <SectionTitleInput
                    initialValue={title}
                    onSave={(newVal) => updateSectionLabel(index, newVal)}
                />
            ) : (
                <h3 className="section-title">{title}</h3>
            )}
            {!hideReorder && (
                <div style={{ display: 'flex', gap: '4px' }} onClick={(e) => e.stopPropagation()}>
                    <button className="action-btn btn-sm" onClick={() => moveSection(index, 'up')} disabled={index === 0} title="Move Up">↑</button>
                    <button className="action-btn btn-sm" onClick={() => moveSection(index, 'down')} disabled={index === resumeDataLength - 1} title="Move Down">↓</button>
                    <button className="action-btn btn-sm delete-section-btn" onClick={() => removeSection(index)} title="Delete Section" style={{ color: '#ef4444' }}>×</button>
                </div>
            )}
        </div>
        <span style={{ marginLeft: '10px' }}>{isOpen ? '−' : '+'}</span>
    </div>
);

const Editor = ({ resumeData, setResumeData, settings, setSettings }) => {
    const [activeSection, setActiveSection] = useState('personal');

    const toggleSection = (section) => {
        setActiveSection(activeSection === section ? null : section);
    };

    const handlePersonalChange = (e) => {
        const { name, value } = e.target;
        setResumeData(prev => ({
            ...prev,
            personalInfo: { ...prev.personalInfo, [name]: value }
        }));
    };

    const handleSettingsChange = (e) => {
        const { name, value, type, checked } = e.target;
        setSettings(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleArrayChange = (section, index, field, value) => {
        setResumeData(prev => {
            const newSection = [...prev[section]];
            newSection[index] = { ...newSection[index], [field]: value };
            return { ...prev, [section]: newSection };
        });
    };

    const addItem = (section, item) => {
        setResumeData(prev => ({
            ...prev,
            [section]: [...prev[section], item]
        }));
        if (activeSection !== section) setActiveSection(section);
    };

    const removeItem = (section, index) => {
        setResumeData(prev => ({
            ...prev,
            [section]: prev[section].filter((_, i) => i !== index)
        }));
    };

    const moveItem = (section, index, direction) => {
        setResumeData(prev => {
            const newSection = [...prev[section]];
            if (direction === 'up' && index > 0) {
                [newSection[index], newSection[index - 1]] = [newSection[index - 1], newSection[index]];
            } else if (direction === 'down' && index < newSection.length - 1) {
                [newSection[index], newSection[index + 1]] = [newSection[index + 1], newSection[index]];
            }
            return { ...prev, [section]: newSection };
        });
    };

    const moveSection = (index, direction) => {
        setResumeData(prev => {
            const newOrder = [...prev.sectionOrder];
            if (direction === 'up' && index > 0) {
                [newOrder[index], newOrder[index - 1]] = [newOrder[index - 1], newOrder[index]];
            } else if (direction === 'down' && index < newOrder.length - 1) {
                [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
            }
            return { ...prev, sectionOrder: newOrder };
        });
    };

    const removeSection = (index) => {
        if (!window.confirm("Are you sure you want to remove this section? Content will not be deleted, but it won't show in the preview.")) return;
        setResumeData(prev => ({
            ...prev,
            sectionOrder: prev.sectionOrder.filter((_, i) => i !== index)
        }));
    };

    const updateSectionLabel = (index, newLabel) => {
        setResumeData(prev => {
            const newOrder = [...prev.sectionOrder];
            newOrder[index] = { ...newOrder[index], label: newLabel };
            return { ...prev, sectionOrder: newOrder };
        });
    };

    const addBullet = (section, index, field) => {
        setResumeData(prev => {
            const newSection = [...prev[section]];
            const currentVal = newSection[index][field] || '';
            newSection[index] = {
                ...newSection[index],
                [field]: currentVal ? currentVal + '\n• ' : '• '
            };
            return { ...prev, [section]: newSection };
        });
    };



    const renderAccordionSection = (sectionId, label, index) => {
        const commonProps = {
            id: sectionId,
            title: label,
            index: index,
            isOpen: activeSection === sectionId,
            onClick: () => toggleSection(sectionId),
            updateSectionLabel,
            moveSection,
            removeSection,
            resumeDataLength: resumeData.sectionOrder.length
        };

        switch (sectionId) {
            case 'experience':
                return (
                    <div className="section" key={sectionId}>
                        <SectionHeader {...commonProps} />
                        <div className={`section-body ${activeSection === sectionId ? 'open' : ''}`}>
                            {resumeData.experience.map((exp, index) => (
                                <div key={index} className="item-card">
                                    <div className="item-actions">
                                        <button className="action-btn" onClick={() => moveItem('experience', index, 'up')} disabled={index === 0}>↑</button>
                                        <button className="action-btn" onClick={() => moveItem('experience', index, 'down')} disabled={index === resumeData.experience.length - 1}>↓</button>
                                        <button className="action-btn delete" onClick={() => removeItem('experience', index)}>🗑</button>
                                    </div>
                                    <div className="form-grid">
                                        <div className="input-group">
                                            <label>Company</label>
                                            <input value={exp.company} onChange={(e) => handleArrayChange('experience', index, 'company', e.target.value)} placeholder="Tech Corp" />
                                        </div>
                                        <div className="input-group">
                                            <label>Position</label>
                                            <input value={exp.role} onChange={(e) => handleArrayChange('experience', index, 'role', e.target.value)} placeholder="Software Engineer" />
                                        </div>
                                        <div className="input-group">
                                            <label>Start Date</label>
                                            <input value={exp.startDate} onChange={(e) => handleArrayChange('experience', index, 'startDate', e.target.value)} placeholder="Jan 2023" />
                                        </div>
                                        <div className="input-group">
                                            <label>End Date</label>
                                            <input value={exp.endDate} onChange={(e) => handleArrayChange('experience', index, 'endDate', e.target.value)} placeholder="Present" />
                                        </div>
                                    </div>
                                    <div className="input-group">
                                        <label>Description <button className="bullet-btn" onClick={() => addBullet('experience', index, 'description')}>+ Bullet</button></label>
                                        <textarea value={exp.description} onChange={(e) => handleArrayChange('experience', index, 'description', e.target.value)} placeholder="• Developed new features..." style={{ minHeight: '120px' }} />
                                    </div>
                                </div>
                            ))}
                            <button className="add-btn" onClick={() => addItem('experience', { company: '', role: '', startDate: '', endDate: '', description: '' })}>+ Add Experience</button>
                        </div>
                    </div>
                );
            case 'education':
                return (
                    <div className="section" key={sectionId}>
                        <SectionHeader {...commonProps} />
                        <div className={`section-body ${activeSection === sectionId ? 'open' : ''}`}>
                            {resumeData.education.map((edu, index) => (
                                <div key={index} className="item-card">
                                    <div className="item-actions">
                                        <button className="action-btn" onClick={() => moveItem('education', index, 'up')} disabled={index === 0}>↑</button>
                                        <button className="action-btn" onClick={() => moveItem('education', index, 'down')} disabled={index === resumeData.education.length - 1}>↓</button>
                                        <button className="action-btn delete" onClick={() => removeItem('education', index)}>🗑</button>
                                    </div>
                                    <div className="form-grid">
                                        <div className="input-group">
                                            <label>School</label>
                                            <input value={edu.school} onChange={(e) => handleArrayChange('education', index, 'school', e.target.value)} placeholder="University..." />
                                        </div>
                                        <div className="input-group">
                                            <label>Degree</label>
                                            <input value={edu.degree} onChange={(e) => handleArrayChange('education', index, 'degree', e.target.value)} placeholder="Bachelor of..." />
                                        </div>
                                        <div className="input-group">
                                            <label>Start Date</label>
                                            <input value={edu.startDate} onChange={(e) => handleArrayChange('education', index, 'startDate', e.target.value)} placeholder="Aug 2018" />
                                        </div>
                                        <div className="input-group">
                                            <label>End Date</label>
                                            <input value={edu.endDate} onChange={(e) => handleArrayChange('education', index, 'endDate', e.target.value)} placeholder="May 2022" />
                                        </div>
                                        <div className="input-group">
                                            <label>GPA</label>
                                            <input value={edu.gpa} onChange={(e) => handleArrayChange('education', index, 'gpa', e.target.value)} placeholder="3.8/4.0" />
                                        </div>
                                    </div>
                                </div>
                            ))}
                            <button className="add-btn" onClick={() => addItem('education', { school: '', degree: '', startDate: '', endDate: '', gpa: '' })}>+ Add Education</button>
                        </div>
                    </div>
                );
            case 'projects':
                return (
                    <div className="section" key={sectionId}>
                        <SectionHeader {...commonProps} />
                        <div className={`section-body ${activeSection === sectionId ? 'open' : ''}`}>
                            {resumeData.projects.map((proj, index) => (
                                <div key={index} className="item-card">
                                    <div className="item-actions">
                                        <button className="action-btn" onClick={() => moveItem('projects', index, 'up')} disabled={index === 0}>↑</button>
                                        <button className="action-btn" onClick={() => moveItem('projects', index, 'down')} disabled={index === resumeData.projects.length - 1}>↓</button>
                                        <button className="action-btn delete" onClick={() => removeItem('projects', index)}>🗑</button>
                                    </div>
                                    <div className="form-grid">
                                        <div className="input-group">
                                            <label>Project Name</label>
                                            <input value={proj.name} onChange={(e) => handleArrayChange('projects', index, 'name', e.target.value)} />
                                        </div>
                                        <div className="input-group">
                                            <label>Technologies</label>
                                            <input value={proj.tech} onChange={(e) => handleArrayChange('projects', index, 'tech', e.target.value)} placeholder="React, Node.js" />
                                        </div>
                                    </div>
                                    <div className="input-group">
                                        <label>Link</label>
                                        <input value={proj.link} onChange={(e) => handleArrayChange('projects', index, 'link', e.target.value)} placeholder="github.com/..." />
                                    </div>
                                    <div className="input-group">
                                        <label>Description <button className="bullet-btn" onClick={() => addBullet('projects', index, 'description')}>+ Bullet</button></label>
                                        <textarea value={proj.description} onChange={(e) => handleArrayChange('projects', index, 'description', e.target.value)} placeholder="• Built a cool app..." />
                                    </div>
                                </div>
                            ))}
                            <button className="add-btn" onClick={() => addItem('projects', { name: '', tech: '', link: '', description: '' })}>+ Add Project</button>
                        </div>
                    </div>
                );
            case 'skills':
                return (
                    <div className="section" key={sectionId}>
                        <SectionHeader {...commonProps} />
                        <div className={`section-body ${activeSection === sectionId ? 'open' : ''}`}>
                            <div className="input-group">
                                <label>Technical Skills (Comma separated)</label>
                                <textarea value={resumeData.skills} onChange={(e) => setResumeData({ ...resumeData, skills: e.target.value })} placeholder="JavaScript, React, Python... (Arranged in columns of 4)" />
                            </div>
                        </div>
                    </div>
                );
            case 'languages':
                return (
                    <div className="section" key={sectionId}>
                        <SectionHeader {...commonProps} />
                        <div className={`section-body ${activeSection === sectionId ? 'open' : ''}`}>
                            <div className="input-group">
                                <label>Languages (Comma separated or Description)</label>
                                <textarea value={resumeData.languages} onChange={(e) => setResumeData({ ...resumeData, languages: e.target.value })} placeholder="English (Native), Spanish (Intermediate)..." />
                            </div>
                        </div>
                    </div>
                );
            case 'certificates':
                return (
                    <div className="section" key={sectionId}>
                        <SectionHeader {...commonProps} />
                        <div className={`section-body ${activeSection === sectionId ? 'open' : ''}`}>
                            {resumeData.certificates.map((cert, index) => (
                                <div key={index} className="item-card">
                                    <div className="item-actions">
                                        <button className="action-btn" onClick={() => moveItem('certificates', index, 'up')} disabled={index === 0}>↑</button>
                                        <button className="action-btn" onClick={() => moveItem('certificates', index, 'down')} disabled={index === resumeData.certificates.length - 1}>↓</button>
                                        <button className="action-btn delete" onClick={() => removeItem('certificates', index)}>🗑</button>
                                    </div>
                                    <div className="form-grid">
                                        <div className="input-group">
                                            <label>Certificate Name</label>
                                            <input value={cert.name} onChange={(e) => handleArrayChange('certificates', index, 'name', e.target.value)} placeholder="AWS..." />
                                        </div>
                                        <div className="input-group">
                                            <label>Issuer</label>
                                            <input value={cert.issuer} onChange={(e) => handleArrayChange('certificates', index, 'issuer', e.target.value)} placeholder="Amazon..." />
                                        </div>
                                        <div className="input-group">
                                            <label>Date</label>
                                            <input value={cert.date} onChange={(e) => handleArrayChange('certificates', index, 'date', e.target.value)} placeholder="Aug 2023" />
                                        </div>
                                        <div className="input-group">
                                            <label>Link/ID</label>
                                            <input value={cert.link} onChange={(e) => handleArrayChange('certificates', index, 'link', e.target.value)} placeholder="URL or ID" />
                                        </div>
                                    </div>
                                </div>
                            ))}
                            <button className="add-btn" onClick={() => addItem('certificates', { name: '', issuer: '', date: '', link: '' })}>+ Add Certificate</button>
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="editor-panel panel">
            {/* Settings / Appearance */}
            <div className="section">
                <SectionHeader
                    title="Appearance & Settings"
                    isOpen={activeSection === 'appearance'}
                    onClick={() => toggleSection('appearance')}
                    hideReorder
                />
                <div className={`section-body ${activeSection === 'appearance' ? 'open' : ''}`}>
                    <div className="form-grid">
                        <div className="input-group">
                            <label>Accent Color</label>
                            <input type="color" name="accentColor" value={settings.accentColor} onChange={handleSettingsChange} style={{ padding: '0.2rem', height: '40px' }} />
                        </div>
                        <div className="input-group">
                            <label>Name Color</label>
                            <input type="color" name="nameColor" value={settings.nameColor} onChange={handleSettingsChange} style={{ padding: '0.2rem', height: '40px' }} />
                        </div>
                        <div className="input-group">
                            <label>Font Family</label>
                            <select name="fontFamily" value={settings.fontFamily} onChange={handleSettingsChange}>
                                <option value="Times New Roman">Times New Roman (Serif)</option>
                                <option value="Georgia">Georgia (Serif)</option>
                                <option value="Arial">Arial (Sans-Serif)</option>
                                <option value="Helvetica">Helvetica (Sans-Serif)</option>
                                <option value="Calibri">Calibri (Sans-Serif)</option>
                            </select>
                        </div>
                        <div className="input-group">
                            <label>Template Style</label>
                            <select name="template" value={settings.template} onChange={handleSettingsChange}>
                                <option value="standard">Standard (ATS)</option>
                                <option value="two-column">Two-Column (Sidebar)</option>
                                <option value="two-column-photo">Two-Column (Photo Profile)</option>
                            </select>
                        </div>
                        <div className="input-group">
                            <label>Page Limit</label>
                            <select name="pageSize" value={settings.pageSize} onChange={handleSettingsChange}>
                                <option value="1">Fit to 1 Page</option>
                                <option value="2">2 Pages</option>
                                <option value="auto">Auto (Flexible)</option>
                            </select>
                        </div>
                        <div className="input-group" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '1.8rem' }}>
                            <input type="checkbox" name="showIcons" checked={settings.showIcons} onChange={handleSettingsChange} style={{ width: 'auto' }} />
                            <label style={{ margin: 0 }}>Show Icons</label>
                        </div>
                    </div>
                    <div style={{ marginTop: '1rem' }}>
                        <label style={{ fontSize: '0.8rem', marginBottom: '0.5rem' }}>Quick Themes</label>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                            <button className="btn-sm btn-outline" onClick={() => setSettings({ ...settings, accentColor: '#2563eb', nameColor: '#2563eb', fontFamily: 'Arial', pageSize: '1' })}>Blue Corporate</button>
                            <button className="btn-sm btn-outline" onClick={() => setSettings({ ...settings, accentColor: '#059669', nameColor: '#059669', fontFamily: 'Georgia', pageSize: '1' })}>Emerald Professional</button>
                            <button className="btn-sm btn-outline" onClick={() => setSettings({ ...settings, accentColor: '#dc2626', nameColor: '#dc2626', fontFamily: 'Times New Roman', pageSize: '1' })}>Classic Red</button>
                            <button className="btn-sm btn-outline" onClick={() => setSettings({ ...settings, accentColor: '#7c3aed', nameColor: '#7c3aed', fontFamily: 'Calibri', pageSize: '1' })}>Modern Purple</button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="editor-content">
                {/* Personal Info - Fixed at top for simplicity */}
                <div className="section">
                    <SectionHeader title="Personal Information" isOpen={activeSection === 'personal'} onClick={() => toggleSection('personal')} hideReorder />
                    <div className={`section-body ${activeSection === 'personal' ? 'open' : ''}`}>
                        <div className="form-grid">
                            <div className="input-group"><label>Full Name</label><input type="text" name="fullName" value={resumeData.personalInfo.fullName} onChange={handlePersonalChange} placeholder="John Doe" /></div>
                            <div className="input-group"><label>Professional Title</label><input type="text" name="title" value={resumeData.personalInfo.title} onChange={handlePersonalChange} placeholder="Software Developer" /></div>
                            <div className="input-group"><label>Profile Image URL</label><input type="text" name="profileImage" value={resumeData.personalInfo.profileImage} onChange={handlePersonalChange} placeholder="https://example.com/photo.jpg" /></div>
                            <div className="input-group"><label>Email</label><input type="email" name="email" value={resumeData.personalInfo.email} onChange={handlePersonalChange} placeholder="john@example.com" /></div>
                            <div className="input-group"><label>Phone</label><input type="text" name="phone" value={resumeData.personalInfo.phone} onChange={handlePersonalChange} placeholder="(555) 123-4567" /></div>
                            <div className="input-group"><label>Location</label><input type="text" name="location" value={resumeData.personalInfo.location} onChange={handlePersonalChange} placeholder="City, State" /></div>
                            <div className="input-group"><label>LinkedIn URL</label><input type="text" name="linkedin" value={resumeData.personalInfo.linkedin} onChange={handlePersonalChange} placeholder="linkedin.com/in/john" /></div>
                            <div className="input-group"><label>GitHub URL</label><input type="text" name="github" value={resumeData.personalInfo.github} onChange={handlePersonalChange} placeholder="github.com/john" /></div>
                            <div className="input-group"><label>Portfolio URL</label><input type="text" name="portfolio" value={resumeData.personalInfo.portfolio} onChange={handlePersonalChange} placeholder="mywebsite.com" /></div>
                        </div>
                        <div className="input-group"><label>Professional Summary</label><textarea name="summary" value={resumeData.personalInfo.summary} onChange={handlePersonalChange} placeholder="Brief summary..." /></div>
                    </div>
                </div>

                {/* Rearrangeable Sections */}
                {resumeData.sectionOrder.map((section, index) =>
                    renderAccordionSection(section.id, section.label, index)
                )}
            </div>
        </div>
    );
};

export default Editor;
