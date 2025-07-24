// Author: Rishabh Gupta
// Date: July 22, 2025
// Project: Artworks Table with Smart Row Selection using PrimeReact

import React, { useState, useEffect, useRef } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Checkbox } from 'primereact/checkbox';
import { Toast } from 'primereact/toast';
import 'primereact/resources/themes/lara-light-cyan/theme.css';
import 'primereact/resources/primereact.min.css';
import 'primeicons/primeicons.css';

interface Artwork {
  id: number;
  title: string;
  place_of_origin: string;
  artist_display: string;
  inscriptions: string;
  date_start: number;
  date_end: number;
}

interface ApiResponse {
  data: Artwork[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    total_pages: number;
    current_page: number;
  };
}

const App: React.FC = () => {
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(0);
  const [pageSize, setPageSize] = useState<number>(10);
  const [totalRecords, setTotalRecords] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(0);

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [isAllSelected, setIsAllSelected] = useState<boolean>(false);
  const [showDropdown, setShowDropdown] = useState<boolean>(false);
  const [inputValue, setInputValue] = useState<string>('');

  const toastRef = useRef<Toast>(null);

  const fetchData = async (page: number, rows: number) => {
    const url = `https://api.artic.edu/api/v1/artworks?page=${page + 1}&limit=${rows}&fields=id,title,place_of_origin,artist_display,inscriptions,date_start,date_end`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error('Network request failed');
    }
    console.log('Fetched artwork page:', page);
    return res.json();
  };

  const loadPage = async (page: number = 0, rows: number = 10) => {
    setLoading(true);
    try {
      const data = await fetchData(page, rows);
      setArtworks(data.data);
      setCurrentPage(page);
      setPageSize(rows);
      setTotalRecords(data.pagination.total);
      setTotalPages(data.pagination.total_pages);
      updateSelectAllStatus(data.data);
    } catch (err) {
      console.error('Error loading data:', err);
      toastRef.current?.show({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to load data'
      });
    }
    setLoading(false);
  };

  const updateSelectAllStatus = (pageData: Artwork[]) => {
    const pageIds = pageData.map(item => item.id);
    const allSelected = pageIds.length > 0 && pageIds.every(id => selectedIds.has(id));
    setIsAllSelected(allSelected);
  };

  useEffect(() => {
    loadPage(0, 10);
  }, []);

  const onPageChange = (event: any) => {
    loadPage(event.page, event.rows);
  };

  const handleCheckbox = (id: number, checked: boolean) => {
    const updatedIds = new Set(selectedIds);
    if (checked) updatedIds.add(id);
    else updatedIds.delete(id);
    setSelectedIds(updatedIds);
    const pageIds = artworks.map(item => item.id);
    setIsAllSelected(pageIds.every(pid => updatedIds.has(pid)));
  };

  const handleSelectAll = (checked: boolean) => {
    const updatedIds = new Set(selectedIds);
    const pageIds = artworks.map(item => item.id);
    pageIds.forEach(id => checked ? updatedIds.add(id) : updatedIds.delete(id));
    setSelectedIds(updatedIds);
    setIsAllSelected(checked);
  };

  const selectRows = async () => {
    const num = parseInt(inputValue);
    if (!num || isNaN(num) || num <= 0) {
      toastRef.current?.show({ severity: 'warn', summary: 'Invalid input', detail: 'Enter a valid number' });
      return;
    }
    if (num > totalRecords) {
      toastRef.current?.show({ severity: 'warn', summary: 'Too many rows', detail: `Only ${totalRecords} available` });
      return;
    }

    setLoading(true);
    const updatedIds = new Set(selectedIds);
    let itemsSelected = 0, page = 0;
    const itemsPerPage = 50;
    try {
      while (itemsSelected < num) {
        const data = await fetchData(page, itemsPerPage);
        const itemsToTake = Math.min(num - itemsSelected, data.data.length);
        for (let i = 0; i < itemsToTake; i++) {
          updatedIds.add(data.data[i].id);
          itemsSelected++;
        }
        if (data.data.length < itemsPerPage) break;
        page++;
      }
      setSelectedIds(updatedIds);
      setIsAllSelected(artworks.map(i => i.id).every(id => updatedIds.has(id)));
      toastRef.current?.show({ severity: 'success', summary: 'Success', detail: `Selected ${itemsSelected} rows` });
    } catch (err) {
      console.error('Selection error:', err);
      toastRef.current?.show({ severity: 'error', summary: 'Error', detail: 'Selection failed' });
    }
    setLoading(false);
    setShowDropdown(false);
    setInputValue('');
  };

  const submitSelection = () => {
    if (selectedIds.size === 0) {
      toastRef.current?.show({ severity: 'warn', summary: 'No selection', detail: 'Select rows first' });
      return;
    }
    const ids = Array.from(selectedIds);
    toastRef.current?.show({ severity: 'success', summary: 'Submitted', detail: `Selected IDs: ${ids.join(', ')}` });
    setShowDropdown(false);
    setInputValue('');
  };

  const checkboxTemplate = (data: Artwork) => (
    <Checkbox checked={selectedIds.has(data.id)} onChange={(e) => handleCheckbox(data.id, e.checked || false)} />
  );

  const idTemplate = (data: Artwork) => <span style={{ color: '#666' }}>{data.id}</span>;
  const titleTemplate = (data: Artwork) => <span>{data.title || 'Untitled'}</span>;
  const originTemplate = (data: Artwork) => <span>{data.place_of_origin || 'Unknown'}</span>;
  const dateTemplate = (data: Artwork) => {
    if (data.date_start && data.date_end) return <span>{data.date_start === data.date_end ? data.date_start : `${data.date_start} - ${data.date_end}`}</span>;
    if (data.date_start) return <span>{data.date_start}</span>;
    if (data.date_end) return <span>{data.date_end}</span>;
    return <span>Unknown</span>;
  };
  const artistTemplate = (data: Artwork) => <span>{data.artist_display || 'Unknown Artist'}</span>;

  return (
    <div style={{ padding: '20px', backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
      <Toast ref={toastRef} />
      {/* simplified layout, responsive */}
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ backgroundColor: 'white', border: '1px solid #ddd' }}>
          <DataTable
            value={artworks}
            loading={loading}
            paginator
            rows={pageSize}
            totalRecords={totalRecords}
            lazy
            first={currentPage * pageSize}
            onPage={onPageChange}
            rowsPerPageOptions={[5, 10, 20]}
            paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
            currentPageReportTemplate="Showing {first} to {last} of {totalRecords} entries"
            emptyMessage="No data found"
            className="custom-table"
            style={{ border: 'none' }}
            stripedRows={false}
          >
            <Column
              header={
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative' }}>
                  <Checkbox checked={isAllSelected} onChange={(e) => handleSelectAll(e.checked || false)} />
                  <span style={{ color: '#666', fontSize: '14px' }}>Art ID</span>
                  <i className="pi pi-chevron-down" style={{ fontSize: '12px', color: '#666', cursor: 'pointer', marginLeft: '4px' }} onClick={() => setShowDropdown(!showDropdown)}></i>
                  {showDropdown && (
                    <div style={{ position: 'absolute', top: '100%', left: '0', zIndex: 1000, backgroundColor: 'white', border: '1px solid #ccc', borderRadius: '4px', padding: '15px', minWidth: '300px', boxShadow: '0 2px 8px rgba(0,0,0,0.15)', marginTop: '5px' }}>
                      <div>
                        <InputText value={inputValue} onChange={(e) => setInputValue(e.target.value)} placeholder="Enter number of rows to select..." style={{ width: '200px', marginRight: '10px', padding: '8px 12px', border: '1px solid #ccc' }} onKeyPress={(e) => { if (e.key === 'Enter') selectRows(); }} />
                        <Button label="Select" onClick={selectRows} style={{ padding: '8px 16px', backgroundColor: '#007bff', border: '1px solid #007bff', color: 'white', marginRight: '5px' }} />
                        <Button label="Submit" onClick={submitSelection} style={{ padding: '8px 16px', backgroundColor: '#28a745', border: '1px solid #28a745', color: 'white' }} />
                      </div>
                    </div>
                  )}
                </div>
              }
              body={checkboxTemplate}
              style={{ width: '60px', textAlign: 'center', borderRight: '1px solid #eee' }}
            />
            <Column field="id" body={idTemplate} style={{ width: '120px', paddingLeft: '15px', color: '#666', fontSize: '14px', borderRight: '1px solid #eee' }} />
            <Column header={<span style={{ color: '#666', fontSize: '14px' }}>Art Title</span>} field="title" body={titleTemplate} style={{ minWidth: '200px', paddingLeft: '15px', fontSize: '14px', borderRight: '1px solid #eee' }} />
            <Column header={<span style={{ color: '#666', fontSize: '14px' }}>Origin</span>} field="place_of_origin" body={originTemplate} style={{ minWidth: '150px', paddingLeft: '15px', fontSize: '14px', borderRight: '1px solid #eee' }} />
            <Column header={<span style={{ color: '#666', fontSize: '14px' }}>Period</span>} body={dateTemplate} style={{ minWidth: '120px', paddingLeft: '15px', fontSize: '14px', borderRight: '1px solid #eee' }} />
            <Column header={<span style={{ color: '#666', fontSize: '14px' }}>Artist</span>} field="artist_display" body={artistTemplate} style={{ minWidth: '200px', paddingLeft: '15px', fontSize: '14px' }} />
          </DataTable>
        </div>
        <div style={{ marginTop: '15px', textAlign: 'center' }}>
          {selectedIds.size > 0 && <span style={{ color: '#666', fontSize: '14px' }}>{selectedIds.size} row{selectedIds.size !== 1 ? 's' : ''} selected</span>}
        </div>
      </div>

      <style>{`
        .custom-table .p-datatable-header { display: none; }
        .custom-table .p-datatable-thead > tr > th {
          background-color: #f8f9fa !important;
          border: 1px solid #eee !important;
          padding: 12px 8px !important;
          font-weight: normal !important;
          color: #666 !important;
        }
        .custom-table .p-datatable-tbody > tr > td {
          border: 1px solid #eee !important;
          padding: 12px 8px !important;
          background-color: white !important;
        }
        .custom-table .p-datatable-tbody > tr:hover > td { background-color: #f8f9fa !important; }
        .custom-table .p-paginator {
          background-color: white !important;
          border: 1px solid #ddd !important;
          border-top: none !important;
          padding: 10px !important;
        }
        .custom-table .p-checkbox, .custom-table .p-checkbox .p-checkbox-box {
          width: 16px !important; height: 16px !important; border: 1px solid #ccc !important;
        }
        .p-toast .p-toast-message { margin: 0 0 1rem 0; }
      `}</style>
    </div>
  );
};

export default App;
