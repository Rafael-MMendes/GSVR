with open('frontend/src/components/AdminDashboardV2.jsx', encoding='utf-8') as f:
    text = f.read()

start_marker = '  // --- DESIGN SYSTEM TOKENS ---'
end_marker = '      {/* Global CSS for Animations */}'
s_idx = text.index(start_marker)
e_idx = text.index(end_marker)

replacement = """  const currentCycle = months.find(c => String(c.id_ciclo) === String(selectedCycleId));

  const handleSelectCycle = (newId) => {
    setSelectedCycleId(newId);
    const cycle = months.find(c => String(c.id_ciclo) === String(newId));
    if (cycle) {
      const start = String(cycle.data_inicio).split('T')[0];
      const end = String(cycle.data_fim).split('T')[0];
      const today = new Date().toISOString().split('T')[0];
      if (today < start || today > end) {
        setSelectedDate(start);
      } else {
        setSelectedDate(today);
      }
    }
  };

  if (showPublicacao) {
    return (
      <EscalaPublicacaoOficial
        patrols={state.patrols}
        date={selectedDate}
        cycle={currentCycle}
        onBack={() => setShowPublicacao(false)}
      />
    );
  }

  return (
    <div className="v2-dashboard-container" style={{
      fontFamily: "'Outfit', 'Inter', sans-serif",
      background: '#f1f5f9',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'row',
      overflow: 'hidden'
    }}>
      <ScheduleSidebar
        months={months}
        selectedCycleId={selectedCycleId}
        onSelectCycle={handleSelectCycle}
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
        selectedShift={selectedShift}
        onSelectShift={setSelectedShift}
        showUnavailable={showUnavailable}
        onToggleShowUnavailable={() => setShowUnavailable(!showUnavailable)}
        availableCount={filteredPool.length}
        metas={metas}
        patrolsCount={state.patrols.length}
        isSaving={isSaving}
        onAddPatrol={addPatrol}
        onSaveSchedule={() => saveSchedule()}
        onPublish={() => setShowPublicacao(true)}
      />

      {/* MAIN CONTENT AREA */}
      <div className="v2-main-content" style={{
        flex: 1,
        padding: '2rem',
        overflowY: 'scroll',
        scrollbarGutter: 'stable',
        height: '100vh'
      }}>
        <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: colors.primary }}>
              Escala de Serviço
            </h2>
            <p style={{ margin: 0, color: colors.textMuted, fontSize: '0.9rem' }}>
              Gerencie as guarnições para o dia selecionado
            </p>
          </div>
        </div>

        <div style={{ flex: 1, padding: '0.5rem' }} ref={printRef}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))',
            gap: '1.5rem',
            paddingBottom: '4rem'
          }}>
            {state.patrols.map(patrol => (
              <PatrolCard
                key={patrol.id}
                patrol={patrol}
                savingPatrolId={savingPatrolId}
                activeSlot={activeSlot}
                isSaving={isSaving}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onDragStart={handleDragStart}
                onSettingChange={handlePatrolSettingChange}
                onRemovePatrol={removePatrol}
                onRoleChange={handleRoleChange}
                onOpenSlotModal={(patrolId, slotIndex) => setSelectionMode({ patrolId, slotIndex })}
                onSelectActiveSlot={(patrolId, roleIndex) => setActiveSlot({ patrolId, roleIndex })}
              />
            ))}
          </div>
        </div>
      </div>

      <VolunteerSelectionModal
        selectionMode={selectionMode}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        selectedDate={selectedDate}
        setSelectedDate={setSelectedDate}
        months={months}
        selectedCycleId={selectedCycleId}
        selectedShift={selectedShift}
        setSelectedShift={setSelectedShift}
        showUnavailable={showUnavailable}
        setShowUnavailable={setShowUnavailable}
        newPatrolName={newPatrolName}
        setNewPatrolName={setNewPatrolName}
        newPatrolDuration={newPatrolDuration}
        setNewPatrolDuration={setNewPatrolDuration}
        newPatrolShift={newPatrolShift}
        setNewPatrolShift={setNewPatrolShift}
        state={state}
        filteredPool={filteredPool}
        selectedMembers={selectedMembers}
        toggleMemberSelection={toggleMemberSelection}
        handleShowDetails={handleShowDetails}
        confirmSelection={confirmSelection}
        closeSelectionModal={closeSelectionModal}
        isSaving={isSaving}
      />

      <MilitarDetailsModal
        detailedMilitar={detailedMilitar}
        onClose={() => setDetailedMilitar(null)}
        currentCycle={currentCycle}
        selectedCycleId={selectedCycleId}
        militarGridDisp={militarGridDisp}
        loadingMilitarGrid={loadingMilitarGrid}
        militarSchedules={militarSchedules}
      />

"""

new_text = text[:s_idx] + replacement + text[e_idx:]
with open('frontend/src/components/AdminDashboardV2.jsx', 'w', encoding='utf-8') as f:
    f.write(new_text)

print('New line count:', len(new_text.splitlines()))

