import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createEvent, publishEvent } from '../../api';
import { FiPlus, FiTrash2, FiArrowUp, FiArrowDown } from 'react-icons/fi';
import dayjs from 'dayjs';
import toast from 'react-hot-toast';

const FIELD_TYPES = ['text', 'textarea', 'dropdown', 'checkbox', 'radio', 'file', 'number', 'email'];

const CreateEvent = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({
        name: '', description: '', eventType: 'normal', eligibility: 'all',
        registrationDeadline: '', eventStartDate: '', eventEndDate: '',
        registrationLimit: '', registrationFee: '', tags: '',
    });
    const [formFields, setFormFields] = useState([]);
    const [merchItems, setMerchItems] = useState([]);
    const [purchaseLimit, setPurchaseLimit] = useState(1);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
    };

    // Form builder helpers
    const addField = () => {
        setFormFields([...formFields, {
            fieldId: `field_${Date.now()}`, label: '', type: 'text', options: [], required: false, order: formFields.length,
        }]);
    };

    const updateField = (index, key, value) => {
        setFormFields(prev => prev.map((f, i) => i === index ? { ...f, [key]: value } : f));
    };

    const removeField = (index) => {
        setFormFields(prev => prev.filter((_, i) => i !== index));
    };

    const moveField = (index, direction) => {
        const newFields = [...formFields];
        const target = index + direction;
        if (target < 0 || target >= newFields.length) return;
        [newFields[index], newFields[target]] = [newFields[target], newFields[index]];
        setFormFields(newFields.map((f, i) => ({ ...f, order: i })));
    };

    // Merch helpers
    const addMerchItem = () => {
        setMerchItems([...merchItems, { name: '', variants: [{ size: '', color: '', stock: 0, price: 0 }] }]);
    };

    const updateMerchItem = (itemIdx, key, value) => {
        setMerchItems(prev => prev.map((item, i) => i === itemIdx ? { ...item, [key]: value } : item));
    };

    const addVariant = (itemIdx) => {
        setMerchItems(prev => prev.map((item, i) =>
            i === itemIdx ? { ...item, variants: [...item.variants, { size: '', color: '', stock: 0, price: 0 }] } : item
        ));
    };

    const updateVariant = (itemIdx, varIdx, key, value) => {
        setMerchItems(prev => prev.map((item, i) =>
            i === itemIdx ? {
                ...item,
                variants: item.variants.map((v, vi) => vi === varIdx ? { ...v, [key]: value } : v),
            } : item
        ));
    };

    const removeVariant = (itemIdx, varIdx) => {
        setMerchItems(prev => prev.map((item, i) =>
            i === itemIdx ? { ...item, variants: item.variants.filter((_, vi) => vi !== varIdx) } : item
        ));
    };

    const removeMerchItem = (itemIdx) => {
        setMerchItems(prev => prev.filter((_, i) => i !== itemIdx));
    };

    const handleSaveDraft = async () => {
        if (!form.name) return toast.error('Event name is required');
        setLoading(true);
        try {
            const isMerchType = form.eventType === 'merchandise';
            const payload = {
                ...form,
                registrationLimit: isMerchType ? 0 : (form.registrationLimit ? parseInt(form.registrationLimit) : 0),
                registrationFee: isMerchType ? 0 : (form.registrationFee ? parseFloat(form.registrationFee) : 0),
                tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
            };

            if (isMerchType) {
                payload.merchDetails = { items: merchItems, purchaseLimitPerParticipant: purchaseLimit };
            } else {
                payload.customForm = { fields: formFields, isLocked: false };
            }

            const { data } = await createEvent(payload);
            toast.success('Event saved as draft!');
            navigate(`/organizer/events/${data.event._id}`);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to create event');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="page-container" style={{ maxWidth: 700 }}>
            <div className="page-header">
                <h1 className="page-title">Create Event</h1>
                <p className="page-subtitle">Step {step} of 3</p>
            </div>

            {/* Step indicator */}
            <div className="flex gap-8 mb-16">
                {[1, 2, 3].map(s => (
                    <div key={s} style={{
                        flex: 1, height: 3, borderRadius: 2,
                        background: s <= step ? 'var(--accent)' : 'var(--border)',
                        transition: 'background 0.2s',
                    }} />
                ))}
            </div>

            {/* Step 1: Basic Info */}
            {step === 1 && (
                <div className="card">
                    <h3 className="card-title" style={{ marginBottom: 16 }}>Basic Information</h3>
                    <div className="form-group">
                        <label className="form-label">Event Name *</label>
                        <input className="form-input" name="name" value={form.name} onChange={handleChange} placeholder="e.g., CodeSprint 2026" />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Description</label>
                        <textarea className="form-textarea" name="description" value={form.description} onChange={handleChange} placeholder="Describe your event..." rows={4} />
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Event Type</label>
                            <select className="form-select" name="eventType" value={form.eventType} onChange={handleChange}>
                                <option value="normal">Normal (Workshop/Talk/Competition)</option>
                                <option value="merchandise">Merchandise</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Eligibility</label>
                            <select className="form-select" name="eligibility" value={form.eligibility} onChange={handleChange}>
                                <option value="all">Everyone</option>
                                <option value="iiit-only">IIIT Students Only</option>
                                <option value="non-iiit-only">Non-IIIT Only</option>
                            </select>
                        </div>
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Start Date</label>
                            <input type="datetime-local" className="form-input" name="eventStartDate" value={form.eventStartDate} onChange={handleChange} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">End Date</label>
                            <input type="datetime-local" className="form-input" name="eventEndDate" value={form.eventEndDate} onChange={handleChange} />
                        </div>
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">{form.eventType === 'merchandise' ? 'Purchase Deadline' : 'Registration Deadline'}</label>
                            <input type="datetime-local" className="form-input" name="registrationDeadline" value={form.registrationDeadline} onChange={handleChange} />
                        </div>
                        {form.eventType !== 'merchandise' && (
                            <div className="form-group">
                                <label className="form-label">Registration Limit <span className="text-muted">(0 = unlimited)</span></label>
                                <input type="number" className="form-input" name="registrationLimit" value={form.registrationLimit} onChange={handleChange} min="0" />
                            </div>
                        )}
                    </div>
                    <div className="form-row">
                        {form.eventType !== 'merchandise' && (
                            <div className="form-group">
                                <label className="form-label">Registration Fee (₹)</label>
                                <input type="number" className="form-input" name="registrationFee" value={form.registrationFee} onChange={handleChange} min="0" />
                            </div>
                        )}
                        <div className="form-group">
                            <label className="form-label">Tags <span className="text-muted">(comma-separated)</span></label>
                            <input className="form-input" name="tags" value={form.tags} onChange={handleChange} placeholder="tech, coding, hackathon" />
                        </div>
                    </div>
                    {form.eventType === 'merchandise' && (
                        <p className="text-muted" style={{ fontSize: 12, marginTop: 4 }}>
                            Pricing is set per variant in the next step. Stock and purchase limits control availability.
                        </p>
                    )}
                    <div className="flex justify-between mt-16">
                        <div />
                        <button className="btn btn-primary" onClick={() => setStep(2)}>Next →</button>
                    </div>
                </div>
            )}

            {/* Step 2: Type-specific config */}
            {step === 2 && (
                <div className="card">
                    {form.eventType === 'normal' ? (
                        <>
                            <div className="card-header">
                                <h3 className="card-title">Custom Registration Form</h3>
                                <button className="btn btn-outline btn-sm" onClick={addField}><FiPlus /> Add Field</button>
                            </div>
                            {formFields.length === 0 && (
                                <div className="empty-state" style={{ padding: '24px 0' }}>
                                    <div className="empty-state-text">No custom fields yet</div>
                                    <p className="text-muted mt-8" style={{ fontSize: 13 }}>Add fields to create a custom registration form</p>
                                </div>
                            )}
                            {formFields.map((field, index) => (
                                <div key={field.fieldId} style={{ padding: 14, border: '1px solid var(--border)', borderRadius: 6, marginBottom: 10 }}>
                                    <div className="flex justify-between items-center mb-8">
                                        <span className="text-muted" style={{ fontSize: 12 }}>Field {index + 1}</span>
                                        <div className="flex gap-8">
                                            <button className="btn btn-ghost btn-sm" onClick={() => moveField(index, -1)} disabled={index === 0}><FiArrowUp size={14} /></button>
                                            <button className="btn btn-ghost btn-sm" onClick={() => moveField(index, 1)} disabled={index === formFields.length - 1}><FiArrowDown size={14} /></button>
                                            <button className="btn btn-ghost btn-sm" onClick={() => removeField(index)} style={{ color: 'var(--error)' }}><FiTrash2 size={14} /></button>
                                        </div>
                                    </div>
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label className="form-label">Label</label>
                                            <input className="form-input" value={field.label} onChange={e => updateField(index, 'label', e.target.value)} placeholder="Field label" />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Type</label>
                                            <select className="form-select" value={field.type} onChange={e => updateField(index, 'type', e.target.value)}>
                                                {FIELD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                    {['dropdown', 'checkbox', 'radio'].includes(field.type) && (
                                        <div className="form-group">
                                            <label className="form-label">Options <span className="text-muted">(comma-separated)</span></label>
                                            <input className="form-input" value={field.options.join(', ')} onChange={e => updateField(index, 'options', e.target.value.split(',').map(o => o.trim()))} placeholder="Option 1, Option 2, Option 3" />
                                        </div>
                                    )}
                                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                                        <input type="checkbox" checked={field.required} onChange={e => updateField(index, 'required', e.target.checked)} style={{ accentColor: 'var(--accent)' }} />
                                        Required field
                                    </label>
                                </div>
                            ))}
                        </>
                    ) : (
                        <>
                            <div className="card-header">
                                <h3 className="card-title">Merchandise Items</h3>
                                <button className="btn btn-outline btn-sm" onClick={addMerchItem}><FiPlus /> Add Item</button>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Purchase limit per participant</label>
                                <input type="number" className="form-input" value={purchaseLimit} onChange={e => setPurchaseLimit(parseInt(e.target.value) || 1)} min={1} style={{ maxWidth: 120 }} />
                            </div>
                            {merchItems.map((item, itemIdx) => (
                                <div key={itemIdx} style={{ padding: 14, border: '1px solid var(--border)', borderRadius: 6, marginBottom: 10 }}>
                                    <div className="flex justify-between items-center mb-8">
                                        <div className="form-group" style={{ flex: 1, marginBottom: 0, marginRight: 12 }}>
                                            <label className="form-label" style={{ fontSize: 12, marginBottom: 4 }}>Item Name</label>
                                            <input className="form-input" value={item.name} onChange={e => updateMerchItem(itemIdx, 'name', e.target.value)} placeholder="e.g., T-Shirt, Hoodie, Cap" />
                                        </div>
                                        <button className="btn btn-ghost btn-sm" onClick={() => removeMerchItem(itemIdx)} style={{ color: 'var(--error)', marginTop: 16 }}><FiTrash2 size={14} /></button>
                                    </div>
                                    <label className="form-label">Variants</label>
                                    {/* Column headers */}
                                    {item.variants.length > 0 && (
                                        <div className="flex gap-8 mb-4" style={{ flexWrap: 'wrap' }}>
                                            <span style={{ width: 100, fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600 }}>Size</span>
                                            <span style={{ width: 100, fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600 }}>Color</span>
                                            <span style={{ width: 80, fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600 }}>Stock</span>
                                            <span style={{ width: 80, fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600 }}>Price (₹)</span>
                                        </div>
                                    )}
                                    {item.variants.map((v, varIdx) => (
                                        <div key={varIdx} className="flex gap-8 items-center mb-8" style={{ flexWrap: 'wrap' }}>
                                            <input className="form-input" style={{ width: 100 }} value={v.size} onChange={e => updateVariant(itemIdx, varIdx, 'size', e.target.value)} placeholder="S, M, L..." />
                                            <input className="form-input" style={{ width: 100 }} value={v.color} onChange={e => updateVariant(itemIdx, varIdx, 'color', e.target.value)} placeholder="Black, Red..." />
                                            <input type="number" className="form-input" style={{ width: 80 }} value={v.stock} onChange={e => updateVariant(itemIdx, varIdx, 'stock', parseInt(e.target.value) || 0)} placeholder="0" min={0} />
                                            <input type="number" className="form-input" style={{ width: 80 }} value={v.price} onChange={e => updateVariant(itemIdx, varIdx, 'price', parseFloat(e.target.value) || 0)} placeholder="0" min={0} />
                                            <button className="btn btn-ghost btn-sm" onClick={() => removeVariant(itemIdx, varIdx)} style={{ color: 'var(--error)' }}><FiTrash2 size={14} /></button>
                                        </div>
                                    ))}
                                    <button className="btn btn-ghost btn-sm" onClick={() => addVariant(itemIdx)}><FiPlus size={12} /> Add Variant</button>
                                </div>
                            ))}
                        </>
                    )}
                    <div className="flex justify-between mt-16">
                        <button className="btn btn-ghost" onClick={() => setStep(1)}>← Back</button>
                        <button className="btn btn-primary" onClick={() => setStep(3)}>Next →</button>
                    </div>
                </div>
            )}

            {/* Step 3: Review */}
            {step === 3 && (
                <div className="card">
                    <h3 className="card-title" style={{ marginBottom: 16 }}>Review & Save</h3>
                    <div style={{ fontSize: 14, lineHeight: 2 }}>
                        <div><strong>Name:</strong> {form.name || '—'}</div>
                        <div><strong>Type:</strong> {form.eventType === 'merchandise' ? '🛍️ Merchandise' : '📋 Normal Event'}</div>
                        <div><strong>Eligibility:</strong> {form.eligibility}</div>
                        <div><strong>Start:</strong> {form.eventStartDate ? dayjs(form.eventStartDate).format('ddd, MMM D, YYYY h:mm A') : 'TBA'}</div>
                        <div><strong>End:</strong> {form.eventEndDate ? dayjs(form.eventEndDate).format('ddd, MMM D, YYYY h:mm A') : 'TBA'}</div>
                        <div><strong>{form.eventType === 'merchandise' ? 'Purchase Deadline' : 'Deadline'}:</strong> {form.registrationDeadline ? dayjs(form.registrationDeadline).format('ddd, MMM D, YYYY h:mm A') : 'None'}</div>
                        {form.eventType === 'normal' && <div><strong>Limit:</strong> {form.registrationLimit || 'Unlimited'}</div>}
                        {form.eventType === 'normal' && <div><strong>Fee:</strong> {form.registrationFee ? `₹${form.registrationFee}` : 'Free'}</div>}
                        <div><strong>Tags:</strong> {form.tags || 'None'}</div>
                        {form.eventType === 'normal' && <div><strong>Custom Fields:</strong> {formFields.length}</div>}
                        {form.eventType === 'merchandise' && (
                            <>
                                <div><strong>Merch Items:</strong> {merchItems.length}</div>
                                <div><strong>Total Variants:</strong> {merchItems.reduce((sum, item) => sum + item.variants.length, 0)}</div>
                                <div><strong>Purchase Limit:</strong> {purchaseLimit} per participant</div>
                            </>
                        )}
                    </div>
                    <div className="divider" />
                    <p className="text-muted" style={{ fontSize: 13, marginBottom: 16 }}>
                        The event will be saved as a <strong>Draft</strong>. You can publish it later from the event detail page.
                    </p>
                    <div className="flex justify-between">
                        <button className="btn btn-ghost" onClick={() => setStep(2)}>← Back</button>
                        <button className="btn btn-primary" onClick={handleSaveDraft} disabled={loading}>
                            {loading ? 'Saving...' : 'Save as Draft'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CreateEvent;
