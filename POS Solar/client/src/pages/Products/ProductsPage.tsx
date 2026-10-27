import React, { useEffect, useState, useMemo } from 'react';
import { Package, Plus, Search, Filter, Layers, Barcode, ShieldCheck, Edit3, Trash2 } from 'lucide-react';
import api from '../../lib/api';
import { formatCurrency } from '../../lib/utils';
import { DataTable, Column } from '../../components/ui/DataTable';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Badge } from '../../components/ui/Badge';
import { Product, Category, Brand } from '../../types';

import { useAuthStore } from '../../stores/authStore';

const CATEGORY_ORDER = [
  'Accessories & Protection',
  'Batteries',
  'Cables & Wiring',
  'Inverters',
  'Mounting Structure',
  'Solar Panels',
];

const CATEGORY_ICONS: Record<string, string> = {
  'Accessories & Protection': '🛡️',
  'Batteries': '🔋',
  'Cables & Wiring': '🔌',
  'Inverters': '⚡',
  'Mounting Structure': '🏗️',
  'Solar Panels': '☀️',
};

export const ProductsPage: React.FC = () => {
  const { user } = useAuthStore();
  const isManagerOrHigher = user?.role === 'ADMIN' || user?.role === 'CEO' || user?.role === 'MANAGER';

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'CEO';

  // New Product Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [brandId, setBrandId] = useState('');
  const [modelNumber, setModelNumber] = useState('');
  const [purchasePrice, setPurchasePrice] = useState<number>(0);
  const [salePrice, setSalePrice] = useState<number>(0);
  const [isSerialized, setIsSerialized] = useState(false);
  const [minAlert, setMinAlert] = useState(5);
  const [description, setDescription] = useState('');

  // Edit Product Modal
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editCategoryId, setEditCategoryId] = useState('');
  const [editBrandId, setEditBrandId] = useState('');
  const [editModelNumber, setEditModelNumber] = useState('');
  const [editPurchasePrice, setEditPurchasePrice] = useState<number>(0);
  const [editSalePrice, setEditSalePrice] = useState<number>(0);
  const [editIsSerialized, setEditIsSerialized] = useState(false);
  const [editMinAlert, setEditMinAlert] = useState(5);
  const [editDescription, setEditDescription] = useState('');

  // Delete Product Dialog
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Category Management (Admin Only)
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryDesc, setNewCategoryDesc] = useState('');
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [showEditCategoryModal, setShowEditCategoryModal] = useState(false);
  const [editCategoryName, setEditCategoryName] = useState('');
  const [editCategoryDesc, setEditCategoryDesc] = useState('');
  const [isUpdatingCategory, setIsUpdatingCategory] = useState(false);
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);
  const [isDeletingCategory, setIsDeletingCategory] = useState(false);

  // Brand Management (Admin Only)
  const [showManageBrandsModal, setShowManageBrandsModal] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [brandNameInput, setBrandNameInput] = useState('');
  const [brandCountryInput, setBrandCountryInput] = useState('');
  const [isSavingBrand, setIsSavingBrand] = useState(false);
  const [deletingBrand, setDeletingBrand] = useState<Brand | null>(null);
  const [isDeletingBrand, setIsDeletingBrand] = useState(false);
  const [brandError, setBrandError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [prodRes, catRes, brRes] = await Promise.all([
        api.get('/products'),
        api.get('/products/categories'),
        api.get('/products/brands'),
      ]);

      if (prodRes.data?.success) setProducts(prodRes.data.data);
      if (catRes.data?.success) setCategories(catRes.data.data);
      if (brRes.data?.success) setBrands(brRes.data.data);
    } catch (e) {
      console.error('Failed to load products', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post('/products', {
        name,
        category_id: categoryId,
        brand_id: brandId,
        model_number: modelNumber,
        purchase_price: purchasePrice,
        sale_price: salePrice,
        is_serialized: isSerialized,
        min_stock_alert: minAlert,
        description,
      });

      if (res.data?.success) {
        setShowAddModal(false);
        loadData();
        // reset
        setName('');
        setModelNumber('');
        setDescription('');
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to create product');
    }
  };

  const handleOpenEdit = (p: Product) => {
    setEditingProduct(p);
    setEditName(p.name);
    setEditCategoryId(p.category_id || p.category?.id || '');
    setEditBrandId(p.brand_id || p.brand?.id || '');
    setEditModelNumber(p.model_number || '');
    setEditPurchasePrice(p.purchase_price || 0);
    setEditSalePrice(p.sale_price || 0);
    setEditIsSerialized(Boolean(p.is_serialized));
    setEditMinAlert(p.min_stock_alert ?? 5);
    setEditDescription(p.description || '');
    setShowEditModal(true);
  };

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    try {
      const res = await api.put(`/products/${editingProduct.id}`, {
        name: editName,
        category_id: editCategoryId,
        brand_id: editBrandId,
        model_number: editModelNumber,
        purchase_price: editPurchasePrice,
        sale_price: editSalePrice,
        is_serialized: editIsSerialized,
        min_stock_alert: editMinAlert,
        description: editDescription,
      });

      if (res.data?.success) {
        setShowEditModal(false);
        setEditingProduct(null);
        loadData();
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update product');
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingProduct) return;
    setIsDeleting(true);
    try {
      const res = await api.delete(`/products/${deletingProduct.id}`);
      if (res.data?.success) {
        setDeletingProduct(null);
        loadData();
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete product');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    setIsCreatingCategory(true);
    try {
      const res = await api.post('/products/categories', {
        name: newCategoryName.trim(),
        description: newCategoryDesc.trim() || undefined,
      });
      if (res.data?.success) {
        setShowAddCategoryModal(false);
        setNewCategoryName('');
        setNewCategoryDesc('');
        await loadData();
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to create category');
    } finally {
      setIsCreatingCategory(false);
    }
  };

  const handleConfirmDeleteCategory = async () => {
    if (!deletingCategory) return;
    setIsDeletingCategory(true);
    try {
      const res = await api.delete(`/products/categories/${deletingCategory.id}`);
      if (res.data?.success) {
        if (selectedCategory === deletingCategory.name) {
          setSelectedCategory('all');
        }
        setDeletingCategory(null);
        await loadData();
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete category');
    } finally {
      setIsDeletingCategory(false);
    }
  };

  const handleStartEditCategory = (cat: Category) => {
    setEditingCategory(cat);
    setEditCategoryName(cat.name);
    setEditCategoryDesc(cat.description || '');
    setShowEditCategoryModal(true);
  };

  const handleUpdateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory || !editCategoryName.trim()) return;
    setIsUpdatingCategory(true);
    try {
      const res = await api.put(`/products/categories/${editingCategory.id}`, {
        name: editCategoryName.trim(),
        description: editCategoryDesc.trim() || undefined,
      });
      if (res.data?.success) {
        if (selectedCategory === editingCategory.name) {
          setSelectedCategory(editCategoryName.trim());
        }
        setShowEditCategoryModal(false);
        setEditingCategory(null);
        await loadData();
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update category');
    } finally {
      setIsUpdatingCategory(false);
    }
  };

  // Brand Handlers
  const handleOpenManageBrands = (brandToEdit?: Brand) => {
    if (brandToEdit) {
      setEditingBrand(brandToEdit);
      setBrandNameInput(brandToEdit.name);
      setBrandCountryInput(brandToEdit.country || '');
    } else {
      setEditingBrand(null);
      setBrandNameInput('');
      setBrandCountryInput('');
    }
    setBrandError(null);
    setShowManageBrandsModal(true);
  };

  const handleStartEditBrand = (b: Brand) => {
    setEditingBrand(b);
    setBrandNameInput(b.name);
    setBrandCountryInput(b.country || '');
    setBrandError(null);
  };

  const handleCancelEditBrand = () => {
    setEditingBrand(null);
    setBrandNameInput('');
    setBrandCountryInput('');
    setBrandError(null);
  };

  const handleSaveBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = brandNameInput.trim();
    if (!cleanName) {
      setBrandError('Brand name is required');
      return;
    }

    setIsSavingBrand(true);
    setBrandError(null);

    try {
      if (editingBrand) {
        const res = await api.put(`/products/brands/${editingBrand.id}`, {
          name: cleanName,
          country: brandCountryInput.trim() || undefined,
        });
        if (res.data?.success) {
          setEditingBrand(null);
          setBrandNameInput('');
          setBrandCountryInput('');
          await loadData();
        } else {
          setBrandError(res.data?.error || 'Failed to update brand');
        }
      } else {
        const res = await api.post('/products/brands', {
          name: cleanName,
          country: brandCountryInput.trim() || undefined,
        });
        if (res.data?.success) {
          // If we just added a brand and user had the product modal open, auto-select it if none selected
          if (!brandId) setBrandId(res.data.data.id);
          setBrandNameInput('');
          setBrandCountryInput('');
          await loadData();
        } else {
          setBrandError(res.data?.error || 'Failed to create brand');
        }
      }
    } catch (err: any) {
      setBrandError(err.response?.data?.error || 'Failed to save brand. It may already exist.');
    } finally {
      setIsSavingBrand(false);
    }
  };

  const handleConfirmDeleteBrand = async () => {
    if (!deletingBrand) return;
    setIsDeletingBrand(true);
    try {
      const res = await api.delete(`/products/brands/${deletingBrand.id}`);
      if (res.data?.success) {
        setDeletingBrand(null);
        await loadData();
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete brand');
    } finally {
      setIsDeletingBrand(false);
    }
  };

  const columns: Column<Product>[] = [
    {
      key: 'name',
      header: 'Product & Model',
      sortable: true,
      render: (p) => (
        <div>
          <p className="font-bold text-black dark:text-white text-xs">{p.name}</p>
          <p className="text-[11px] font-semibold text-gray-700 dark:text-gray-300">Model: {p.model_number || 'Standard'}</p>
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      render: (p) => <Badge variant="default" className="font-bold">{p.category?.name || 'N/A'}</Badge>,
    },
    {
      key: 'brand',
      header: 'Brand',
      render: (p) => <span className="font-bold text-black dark:text-white text-xs">{p.brand?.name}</span>,
    },
    {
      key: 'is_serialized',
      header: 'Tracking',
      render: (p) =>
        p.is_serialized ? (
          <Badge variant="info" className="gap-1 font-bold">
            <Barcode className="w-3 h-3" />
            <span>Serialized</span>
          </Badge>
        ) : (
          <span className="font-bold text-xs text-black dark:text-white">Bulk Qty</span>
        ),
    },
    ...(isManagerOrHigher
      ? ([
          {
            key: 'purchase_price',
            header: 'Cost Price',
            sortable: true,
            render: (p: Product) => (
              <span className="font-bold text-black dark:text-white text-xs">
                {formatCurrency(p.purchase_price)}
              </span>
            ),
          },
        ] as Column<Product>[])
      : []),
    {
      key: 'sale_price',
      header: 'Sale Price',
      sortable: true,
      render: (p) => (
        <span className="font-bold text-black dark:text-white text-xs">
          {formatCurrency(p.sale_price)}
        </span>
      ),
    },
    {
      key: 'totalStock',
      header: 'Current Stock',
      sortable: true,
      render: (p) => {
        const qty = p.totalStock ?? 0;
        const isLow = qty <= p.min_stock_alert;
        return (
          <span className={`font-black text-xs ${isLow ? 'text-rose-600' : 'text-emerald-700 dark:text-emerald-400'}`}>
            {qty} units {isLow && '⚠️'}
          </span>
        );
      },
    },
    ...(isAdmin
      ? ([
          {
            key: 'actions',
            header: 'Actions',
            render: (p: Product) => (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  title="Edit Product (Admin Only)"
                  onClick={() => handleOpenEdit(p)}
                  className="p-1.5 bg-solar-50 dark:bg-solar-950/50 hover:bg-solar-100 dark:hover:bg-solar-900/50 text-solar-600 dark:text-solar-400 rounded-lg transition-colors cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  title="Delete Product (Admin Only)"
                  onClick={() => setDeletingProduct(p)}
                  className="p-1.5 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-600 dark:text-rose-400 rounded-lg transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ),
          },
        ] as Column<Product>[])
      : []),
  ];

  const sortedCategories = useMemo(() => {
    return [...categories].sort((a, b) => {
      const idxA = CATEGORY_ORDER.indexOf(a.name);
      const idxB = CATEGORY_ORDER.indexOf(b.name);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [categories]);

  const filteredProducts = useMemo(() => {
    if (selectedCategory === 'all') return products;
    return products.filter(
      (p) =>
        p.category?.name === selectedCategory ||
        p.category_id === selectedCategory ||
        p.category?.id === selectedCategory ||
        p.category?.slug === selectedCategory
    );
  }, [products, selectedCategory]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tight">
            Products
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isAdmin && (
            <button
              type="button"
              onClick={() => handleOpenManageBrands()}
              className="px-3.5 py-2 bg-white dark:bg-slate-900 hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5 text-solar-600" />
              <span>Manage Brands</span>
            </button>
          )}
          {isManagerOrHigher && (
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-solar-600 hover:bg-solar-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add Product</span>
            </button>
          )}
        </div>
      </div>

      {/* Category Filter Tabs / Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
        <button
          type="button"
          onClick={() => setSelectedCategory('all')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
            selectedCategory === 'all'
              ? 'bg-solar-600 text-white shadow-sm'
              : 'bg-white dark:bg-slate-900 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-slate-800 hover:border-solar-400'
          }`}
        >
          <span>All ({products.length})</span>
        </button>

        {sortedCategories.map((cat) => {
          const count = products.filter(
            (p) => p.category_id === cat.id || p.category?.id === cat.id || p.category?.name === cat.name
          ).length;
          const isSelected = selectedCategory === cat.name;

          return (
            <div
              key={cat.id}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                isSelected
                  ? 'bg-solar-600 text-white shadow-sm'
                  : 'bg-white dark:bg-slate-900 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-slate-800 hover:border-solar-400'
              }`}
            >
              <button
                type="button"
                onClick={() => setSelectedCategory(isSelected ? 'all' : cat.name)}
                className="flex items-center gap-1.5 bg-transparent border-0 p-0 text-inherit font-inherit cursor-pointer"
              >
                <span>{cat.name}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    isSelected
                      ? 'bg-white/25 text-white'
                      : 'bg-gray-100 dark:bg-slate-800 text-gray-500'
                  }`}
                >
                  {count}
                </span>
              </button>

              {isAdmin && (
                <div className="flex items-center gap-0.5 ml-1">
                  <button
                    type="button"
                    title={`Edit Category "${cat.name}" (Admin Only)`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStartEditCategory(cat);
                    }}
                    className={`p-1 rounded-md transition-colors cursor-pointer ${
                      isSelected
                        ? 'hover:bg-solar-500 text-white/70 hover:text-white'
                        : 'hover:bg-solar-50 dark:hover:bg-solar-950/50 text-gray-400 hover:text-solar-600'
                    }`}
                  >
                    <Edit3 className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    title={`Delete Category "${cat.name}" (Admin Only)`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeletingCategory(cat);
                    }}
                    className={`p-1 rounded-md transition-colors cursor-pointer ${
                      isSelected
                        ? 'hover:bg-rose-500 text-white/70 hover:text-white'
                        : 'hover:bg-rose-50 dark:hover:bg-rose-950/50 text-gray-400 hover:text-rose-600'
                    }`}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          );
        })}

        {isAdmin && (
          <button
            type="button"
            onClick={() => setShowAddCategoryModal(true)}
            title="Add New Category (Admin Only)"
            className="px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer flex items-center gap-1 bg-solar-50 dark:bg-solar-950/50 hover:bg-solar-100 dark:hover:bg-solar-900/50 text-solar-600 dark:text-solar-400 border border-solar-200 dark:border-solar-800 transition-colors shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Category</span>
          </button>
        )}
      </div>

      <DataTable
        data={filteredProducts}
        columns={columns}
        isLoading={isLoading}
        searchPlaceholder="Search product name, model number, brand, category..."
        searchField={(p) => `${p.name} ${p.model_number} ${p.brand?.name} ${p.category?.name}`}
        emptyTitle="No products added yet"
        emptyMessage="Start building your solar inventory by adding your first panel or inverter."
        emptyAction={
          isManagerOrHigher
            ? {
                label: '+ Add First Product',
                onClick: () => setShowAddModal(true),
                icon: <Plus className="w-3.5 h-3.5" />,
              }
            : undefined
        }
      />

      {/* Add Product Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add New Solar Product to Catalog"
        maxWidth="lg"
      >
        <form onSubmit={handleCreateProduct} className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Product Title *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Longi Hi-MO 6 Explorer 585W Mono Perc"
              className="w-full mt-1 p-2 text-xs bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-700 rounded-xl"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Category *</label>
              <select
                required
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full mt-1 p-2 text-xs bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-700 rounded-xl"
              >
                <option value="">-- Choose Category --</option>
                {sortedCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Brand *</label>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => handleOpenManageBrands()}
                    className="text-[11px] font-bold text-solar-600 hover:text-solar-700 flex items-center gap-1 cursor-pointer"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>Manage Brands</span>
                  </button>
                )}
              </div>
              <select
                required
                value={brandId}
                onChange={(e) => setBrandId(e.target.value)}
                className="w-full mt-1 p-2 text-xs bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-700 rounded-xl"
              >
                <option value="">-- Choose Brand --</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} {b.country ? `(${b.country})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Model Number</label>
              <input
                type="text"
                value={modelNumber}
                onChange={(e) => setModelNumber(e.target.value)}
                placeholder="LR5-72HTH-585M"
                className="w-full mt-1 p-2 text-xs bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-700 rounded-xl"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Cost Price (Rs.)</label>
              <input
                type="number"
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(Number(e.target.value))}
                className="w-full mt-1 p-2 text-xs bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-700 rounded-xl"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Selling Price (Rs.)</label>
              <input
                type="number"
                value={salePrice}
                onChange={(e) => setSalePrice(Number(e.target.value))}
                className="w-full mt-1 p-2 text-xs bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-700 rounded-xl font-bold text-solar-600"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 dark:text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={isSerialized}
                onChange={(e) => setIsSerialized(e.target.checked)}
                className="w-4 h-4 text-solar-600 rounded"
              />
              <span>Track Individual Serial Numbers (Inverter/Battery)</span>
            </label>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Technical Description</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Electrical specifications, cell technology, warranty notes..."
              className="w-full mt-1 p-2 text-xs bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-700 rounded-xl"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2.5 bg-solar-600 hover:bg-solar-700 text-white font-bold text-xs rounded-xl shadow-md mt-2"
          >
            Save Product to Catalog
          </button>
        </form>
      </Modal>

      {/* Edit Product Modal (Admin Only) */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingProduct(null);
        }}
        title="Edit Product (Admin Only)"
        maxWidth="lg"
      >
        <form onSubmit={handleUpdateProduct} className="space-y-4 text-xs">
          <div>
            <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Product Name *</label>
            <input
              type="text"
              required
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full mt-1 p-2 text-xs bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-700 rounded-xl"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Category *</label>
              <select
                required
                value={editCategoryId}
                onChange={(e) => setEditCategoryId(e.target.value)}
                className="w-full mt-1 p-2 text-xs bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-700 rounded-xl"
              >
                <option value="">-- Choose Category --</option>
                {sortedCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Brand *</label>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => handleOpenManageBrands()}
                    className="text-[11px] font-bold text-solar-600 hover:text-solar-700 flex items-center gap-1 cursor-pointer"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>Manage Brands</span>
                  </button>
                )}
              </div>
              <select
                required
                value={editBrandId}
                onChange={(e) => setEditBrandId(e.target.value)}
                className="w-full mt-1 p-2 text-xs bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-700 rounded-xl"
              >
                <option value="">-- Choose Brand --</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} {b.country ? `(${b.country})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Model Number</label>
              <input
                type="text"
                value={editModelNumber}
                onChange={(e) => setEditModelNumber(e.target.value)}
                className="w-full mt-1 p-2 text-xs bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-700 rounded-xl"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Cost Price (Rs.)</label>
              <input
                type="number"
                value={editPurchasePrice}
                onChange={(e) => setEditPurchasePrice(Number(e.target.value))}
                className="w-full mt-1 p-2 text-xs bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-700 rounded-xl"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Selling Price (Rs.)</label>
              <input
                type="number"
                value={editSalePrice}
                onChange={(e) => setEditSalePrice(Number(e.target.value))}
                className="w-full mt-1 p-2 text-xs bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-700 rounded-xl font-bold text-solar-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Min Stock Alert Level</label>
              <input
                type="number"
                value={editMinAlert}
                onChange={(e) => setEditMinAlert(Number(e.target.value))}
                className="w-full mt-1 p-2 text-xs bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-700 rounded-xl"
              />
            </div>
            <div className="flex items-center pt-5">
              <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 dark:text-gray-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editIsSerialized}
                  onChange={(e) => setEditIsSerialized(e.target.checked)}
                  className="w-4 h-4 text-solar-600 rounded"
                />
                <span>Track Individual Serial Numbers</span>
              </label>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Technical Description</label>
            <textarea
              rows={2}
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              className="w-full mt-1 p-2 text-xs bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-700 rounded-xl"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2.5 bg-solar-600 hover:bg-solar-700 text-white font-bold text-xs rounded-xl shadow-md mt-2 cursor-pointer"
          >
            Update Product Details
          </button>
        </form>
      </Modal>

      {/* Delete Product Confirmation (Admin Only) */}
      <ConfirmDialog
        isOpen={!!deletingProduct}
        title="Delete Product"
        message="Are you sure you want to delete this product? If this item has existing sale or purchase order history, it will be safely archived to preserve invoice integrity."
        variant="danger"
        confirmLabel="Yes, Delete Product"
        cancelLabel="Cancel"
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
        onClose={() => setDeletingProduct(null)}
        details={[
          { label: 'Product Name', value: deletingProduct?.name || '' },
          { label: 'Model Number', value: deletingProduct?.model_number || 'Standard' },
          { label: 'Category', value: deletingProduct?.category?.name || 'N/A' },
          { label: 'Sale Price', value: formatCurrency(deletingProduct?.sale_price || 0) },
        ]}
      />

      {/* Add Category Modal (Admin Only) */}
      <Modal
        isOpen={showAddCategoryModal}
        onClose={() => setShowAddCategoryModal(false)}
        title="Create New Category (Admin Only)"
        maxWidth="sm"
      >
        <form onSubmit={handleCreateCategory} className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Category Name *</label>
            <input
              type="text"
              required
              placeholder="e.g., Solar Water Heaters, EV Chargers..."
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              className="w-full mt-1 p-2 text-xs bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-700 rounded-xl"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Description (Optional)</label>
            <textarea
              rows={2}
              placeholder="Brief description of products in this category..."
              value={newCategoryDesc}
              onChange={(e) => setNewCategoryDesc(e.target.value)}
              className="w-full mt-1 p-2 text-xs bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-700 rounded-xl"
            />
          </div>
          <button
            type="submit"
            disabled={isCreatingCategory}
            className="w-full py-2.5 bg-solar-600 hover:bg-solar-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md mt-2 cursor-pointer"
          >
            {isCreatingCategory ? 'Creating...' : '+ Create Category'}
          </button>
        </form>
      </Modal>

      {/* Delete Category Confirmation (Admin Only) */}
      <ConfirmDialog
        isOpen={!!deletingCategory}
        title="Delete Category"
        message={`Are you sure you want to delete the category "${deletingCategory?.name}"? You cannot delete a category if products are still assigned to it.`}
        variant="danger"
        confirmLabel="Yes, Delete Category"
        cancelLabel="Cancel"
        isLoading={isDeletingCategory}
        onConfirm={handleConfirmDeleteCategory}
        onClose={() => setDeletingCategory(null)}
        details={[
          { label: 'Category Name', value: deletingCategory?.name || '' },
          {
            label: 'Assigned Products',
            value: `${products.filter((p) => p.category_id === deletingCategory?.id || p.category?.id === deletingCategory?.id).length} products`,
          },
        ]}
      />

      {/* Edit Category Modal (Admin Only) */}
      <Modal
        isOpen={showEditCategoryModal}
        onClose={() => {
          setShowEditCategoryModal(false);
          setEditingCategory(null);
        }}
        title={`Edit Category: ${editingCategory?.name}`}
        maxWidth="sm"
      >
        <form onSubmit={handleUpdateCategory} className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Category Name *</label>
            <input
              type="text"
              required
              value={editCategoryName}
              onChange={(e) => setEditCategoryName(e.target.value)}
              className="w-full mt-1 p-2 text-xs bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-700 rounded-xl"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Description (Optional)</label>
            <textarea
              rows={2}
              value={editCategoryDesc}
              onChange={(e) => setEditCategoryDesc(e.target.value)}
              className="w-full mt-1 p-2 text-xs bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-700 rounded-xl"
            />
          </div>
          <button
            type="submit"
            disabled={isUpdatingCategory || !editCategoryName.trim()}
            className="w-full py-2.5 bg-solar-600 hover:bg-solar-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md mt-2 cursor-pointer"
          >
            {isUpdatingCategory ? 'Updating...' : 'Save Category Changes'}
          </button>
        </form>
      </Modal>

      {/* Manage Brands Modal (Admin Only) */}
      <Modal
        isOpen={showManageBrandsModal}
        onClose={() => {
          setShowManageBrandsModal(false);
          setEditingBrand(null);
          setBrandNameInput('');
          setBrandCountryInput('');
          setBrandError(null);
        }}
        title="Brand Management (Admin Only)"
        maxWidth="xl"
      >
        <div className="space-y-5">
          {/* Add / Edit Form Card */}
          <div className="p-4 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-2xl">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-800 dark:text-gray-200">
                {editingBrand ? `✏️ Edit Brand: ${editingBrand.name}` : '➕ Add New Brand'}
              </h4>
              {editingBrand && (
                <button
                  type="button"
                  onClick={handleCancelEditBrand}
                  className="text-[11px] font-semibold text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 cursor-pointer"
                >
                  Cancel Edit
                </button>
              )}
            </div>

            {brandError && (
              <div className="mb-3 p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl text-rose-700 dark:text-rose-300 text-xs font-medium">
                {brandError}
              </div>
            )}

            <form onSubmit={handleSaveBrand} className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
              <div className="sm:col-span-1">
                <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Brand Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Growatt, Inverex, Fronius"
                  value={brandNameInput}
                  onChange={(e) => setBrandNameInput(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div className="sm:col-span-1">
                <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Country / Origin (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. China, Germany, Pakistan"
                  value={brandCountryInput}
                  onChange={(e) => setBrandCountryInput(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div className="sm:col-span-1">
                <button
                  type="submit"
                  disabled={isSavingBrand || !brandNameInput.trim()}
                  className="w-full py-2 px-4 bg-solar-600 hover:bg-solar-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {isSavingBrand ? (
                    'Saving...'
                  ) : editingBrand ? (
                    'Update Brand'
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Brand</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Existing Brands Table */}
          <div>
            <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">
              Registered Brands ({brands.length})
            </h4>
            <div className="max-h-64 overflow-y-auto custom-scrollbar border border-gray-200 dark:border-slate-800 rounded-xl">
              <table className="w-full text-xs text-left">
                <thead className="bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 font-bold sticky top-0">
                  <tr>
                    <th className="p-2.5 pl-3">Brand Name</th>
                    <th className="p-2.5">Origin</th>
                    <th className="p-2.5">Products</th>
                    <th className="p-2.5 pr-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                  {brands.map((b) => {
                    const prodCount = products.filter((p) => p.brand_id === b.id || p.brand?.id === b.id).length;
                    const isCurrentlyEditing = editingBrand?.id === b.id;

                    return (
                      <tr
                        key={b.id}
                        className={`hover:bg-gray-50 dark:hover:bg-slate-800/60 transition-colors ${
                          isCurrentlyEditing ? 'bg-solar-50/60 dark:bg-solar-950/30' : ''
                        }`}
                      >
                        <td className="p-2.5 pl-3 font-semibold text-gray-900 dark:text-white">
                          <div className="flex flex-wrap items-center gap-2">
                            <span>{b.name}</span>
                            {isCurrentlyEditing && (
                              <span className="text-[10px] px-1.5 py-0.5 bg-solar-100 dark:bg-solar-900/60 text-solar-700 dark:text-solar-300 rounded font-bold">
                                Editing
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-2.5 text-gray-500 dark:text-gray-400">
                          {b.country || '—'}
                        </td>
                        <td className="p-2.5 text-gray-500 dark:text-gray-400">
                          <span className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-slate-800 text-[10px] font-bold">
                            {prodCount} items
                          </span>
                        </td>
                        <td className="p-2.5 pr-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleStartEditBrand(b)}
                              title="Edit Brand"
                              className="p-1 rounded-lg hover:bg-solar-50 dark:hover:bg-solar-950/50 text-gray-500 hover:text-solar-600 transition-colors cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setDeletingBrand(b);
                              }}
                              title="Delete Brand"
                              className="p-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/50 text-gray-500 hover:text-rose-600 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </Modal>

      {/* Delete Brand Confirmation (Admin Only) */}
      <ConfirmDialog
        isOpen={!!deletingBrand}
        title="Delete Brand"
        message={`Are you sure you want to delete the brand "${deletingBrand?.name}"? You cannot delete a brand if products are still assigned to it.`}
        variant="danger"
        confirmLabel="Yes, Delete Brand"
        cancelLabel="Cancel"
        isLoading={isDeletingBrand}
        onConfirm={handleConfirmDeleteBrand}
        onClose={() => setDeletingBrand(null)}
        details={[
          { label: 'Brand Name', value: deletingBrand?.name || '' },
          { label: 'Origin', value: deletingBrand?.country || 'N/A' },
          {
            label: 'Assigned Products',
            value: `${products.filter((p) => p.brand_id === deletingBrand?.id || p.brand?.id === deletingBrand?.id).length} products`,
          },
        ]}
      />
    </div>
  );
};