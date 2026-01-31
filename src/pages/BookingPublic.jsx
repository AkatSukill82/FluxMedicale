import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { 
  CalendarDays, 
  Clock, 
  User, 
  Phone, 
  Mail, 
  CheckCircle2, 
  Stethoscope,
  ArrowLeft,
  ArrowRight,
  Loader2
} from 'lucide-react';
import { format, addDays, isBefore, startOfDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import { publicBooking } from '@/functions/publicBooking';

export default function BookingPublic() {
  const [step, setStep] = useState(1);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [availableSlots, setAvailableSlots] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [bookingComplete, setBookingComplete] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    patient_nom: '',
    patient_prenom: '',
    patient_telephone: '',
    patient_email: '',
    type_consultation: 'Consultation',
    motif: ''
  });

  // Charger les médecins au démarrage
  useEffect(() => {
    loadDoctors();
  }, []);

  // Charger les créneaux quand on sélectionne une date
  useEffect(() => {
    if (selectedDate) {
      loadAvailableSlots();
    }
  }, [selectedDate, selectedDoctor]);

  const loadDoctors = async () => {
    try {
      const response = await publicBooking({
        action: 'get_doctors',
        data: {}
      });
      setDoctors(response.data.doctors || []);
      if (response.data.doctors?.length === 1) {
        setSelectedDoctor(response.data.doctors[0].email);
      }
    } catch (e) {
      console.error('Erreur chargement médecins:', e);
    }
  };

  const loadAvailableSlots = async () => {
    setLoading(true);
    try {
      const response = await publicBooking({
        action: 'get_available_slots',
        data: {
          date: format(selectedDate, 'yyyy-MM-dd'),
          medecin_email: selectedDoctor
        }
      });
      setAvailableSlots(response.data.slots || []);
    } catch (e) {
      console.error('Erreur chargement créneaux:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleBooking = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await publicBooking({
        action: 'book_appointment',
        data: {
          date: format(selectedDate, 'yyyy-MM-dd'),
          heure_debut: selectedTime,
          medecin_assigne: selectedDoctor,
          ...formData
        }
      });

      if (response.data.success) {
        setBookingComplete(true);
      } else {
        setError(response.data.error || 'Une erreur est survenue');
      }
    } catch (e) {
      setError(e.response?.data?.error || 'Une erreur est survenue lors de la réservation');
    } finally {
      setLoading(false);
    }
  };

  const canProceedStep1 = selectedDoctor && selectedDate && selectedTime;
  const canProceedStep2 = formData.patient_nom && formData.patient_prenom && 
                          formData.patient_telephone && formData.patient_email;

  if (bookingComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="max-w-md w-full"
        >
          <Card className="text-center">
            <CardContent className="pt-10 pb-10">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring' }}
                className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6"
              >
                <CheckCircle2 className="w-10 h-10 text-green-600" />
              </motion.div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Rendez-vous confirmé !
              </h2>
              <p className="text-gray-600 mb-6">
                Votre rendez-vous a été enregistré avec succès.
              </p>
              <div className="bg-gray-50 rounded-lg p-4 text-left space-y-2">
                <div className="flex items-center gap-2 text-gray-700">
                  <CalendarDays className="w-4 h-4 text-blue-600" />
                  <span>{format(selectedDate, 'EEEE d MMMM yyyy', { locale: fr })}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-700">
                  <Clock className="w-4 h-4 text-blue-600" />
                  <span>{selectedTime}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-700">
                  <Stethoscope className="w-4 h-4 text-blue-600" />
                  <span>{doctors.find(d => d.email === selectedDoctor)?.name || 'Médecin'}</span>
                </div>
              </div>
              <p className="text-sm text-gray-500 mt-6">
                Un email de confirmation vous a été envoyé à {formData.patient_email}
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
              <Stethoscope className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">FluxMed</h1>
          </div>
          <h2 className="text-xl text-gray-600">Prise de rendez-vous en ligne</h2>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-4 mb-8">
          {[1, 2, 3].map((s) => (
            <React.Fragment key={s}>
              <div className={`flex items-center gap-2 ${step >= s ? 'text-blue-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                  ${step >= s ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                  {s}
                </div>
                <span className="hidden sm:inline text-sm font-medium">
                  {s === 1 ? 'Date & Heure' : s === 2 ? 'Vos informations' : 'Confirmation'}
                </span>
              </div>
              {s < 3 && <div className={`w-12 h-0.5 ${step > s ? 'bg-blue-600' : 'bg-gray-200'}`} />}
            </React.Fragment>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* Step 1: Date & Time Selection */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <div className="grid md:grid-cols-2 gap-6">
                {/* Doctor Selection & Calendar */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CalendarDays className="w-5 h-5 text-blue-600" />
                      Choisissez une date
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {doctors.length > 1 && (
                      <div>
                        <Label>Médecin</Label>
                        <Select value={selectedDoctor} onValueChange={setSelectedDoctor}>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionnez un médecin" />
                          </SelectTrigger>
                          <SelectContent>
                            {doctors.map(doc => (
                              <SelectItem key={doc.email} value={doc.email}>
                                Dr. {doc.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      locale={fr}
                      disabled={(date) => 
                        isBefore(date, startOfDay(new Date())) || 
                        date.getDay() === 0 || 
                        date.getDay() === 6
                      }
                      className="rounded-md border mx-auto"
                    />
                  </CardContent>
                </Card>

                {/* Time Slots */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="w-5 h-5 text-blue-600" />
                      Créneaux disponibles
                    </CardTitle>
                    {selectedDate && (
                      <CardDescription>
                        {format(selectedDate, 'EEEE d MMMM', { locale: fr })}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    {!selectedDate ? (
                      <p className="text-gray-500 text-center py-8">
                        Sélectionnez une date pour voir les créneaux disponibles
                      </p>
                    ) : loading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                      </div>
                    ) : availableSlots.length === 0 ? (
                      <p className="text-gray-500 text-center py-8">
                        Aucun créneau disponible pour cette date
                      </p>
                    ) : (
                      <div className="grid grid-cols-3 gap-2 max-h-80 overflow-y-auto">
                        {availableSlots.map((slot) => (
                          <Button
                            key={slot.time}
                            variant={selectedTime === slot.time ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setSelectedTime(slot.time)}
                            className={selectedTime === slot.time ? 'bg-blue-600' : ''}
                          >
                            {slot.time}
                          </Button>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              <div className="flex justify-end mt-6">
                <Button 
                  onClick={() => setStep(2)} 
                  disabled={!canProceedStep1}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Continuer
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 2: Patient Information */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="w-5 h-5 text-blue-600" />
                    Vos informations
                  </CardTitle>
                  <CardDescription>
                    Ces informations nous permettront de vous contacter
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="prenom">Prénom *</Label>
                      <Input
                        id="prenom"
                        value={formData.patient_prenom}
                        onChange={(e) => setFormData({...formData, patient_prenom: e.target.value})}
                        placeholder="Votre prénom"
                      />
                    </div>
                    <div>
                      <Label htmlFor="nom">Nom *</Label>
                      <Input
                        id="nom"
                        value={formData.patient_nom}
                        onChange={(e) => setFormData({...formData, patient_nom: e.target.value})}
                        placeholder="Votre nom"
                      />
                    </div>
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="tel">Téléphone *</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                          id="tel"
                          type="tel"
                          value={formData.patient_telephone}
                          onChange={(e) => setFormData({...formData, patient_telephone: e.target.value})}
                          placeholder="0470 12 34 56"
                          className="pl-10"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="email">Email *</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                          id="email"
                          type="email"
                          value={formData.patient_email}
                          onChange={(e) => setFormData({...formData, patient_email: e.target.value})}
                          placeholder="votre@email.com"
                          className="pl-10"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label>Type de consultation</Label>
                    <Select 
                      value={formData.type_consultation} 
                      onValueChange={(v) => setFormData({...formData, type_consultation: v})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Consultation">Consultation générale</SelectItem>
                        <SelectItem value="Contrôle">Contrôle / Suivi</SelectItem>
                        <SelectItem value="Vaccination">Vaccination</SelectItem>
                        <SelectItem value="Bilan">Bilan de santé</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="motif">Motif de consultation</Label>
                    <Textarea
                      id="motif"
                      value={formData.motif}
                      onChange={(e) => setFormData({...formData, motif: e.target.value})}
                      placeholder="Décrivez brièvement le motif de votre visite..."
                      rows={3}
                    />
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-between mt-6">
                <Button variant="outline" onClick={() => setStep(1)}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Retour
                </Button>
                <Button 
                  onClick={() => setStep(3)} 
                  disabled={!canProceedStep2}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Continuer
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 3: Confirmation */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-blue-600" />
                    Récapitulatif
                  </CardTitle>
                  <CardDescription>
                    Vérifiez les informations avant de confirmer
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Appointment Details */}
                  <div className="bg-blue-50 rounded-lg p-4 space-y-3">
                    <h3 className="font-semibold text-blue-900">Votre rendez-vous</h3>
                    <div className="grid md:grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <CalendarDays className="w-4 h-4 text-blue-600" />
                        <span>{format(selectedDate, 'EEEE d MMMM yyyy', { locale: fr })}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-blue-600" />
                        <span>{selectedTime}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Stethoscope className="w-4 h-4 text-blue-600" />
                        <span>Dr. {doctors.find(d => d.email === selectedDoctor)?.name}</span>
                      </div>
                      <div>
                        <Badge>{formData.type_consultation}</Badge>
                      </div>
                    </div>
                  </div>

                  {/* Patient Details */}
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    <h3 className="font-semibold text-gray-900">Vos coordonnées</h3>
                    <div className="grid md:grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-500" />
                        <span>{formData.patient_prenom} {formData.patient_nom}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-gray-500" />
                        <span>{formData.patient_telephone}</span>
                      </div>
                      <div className="flex items-center gap-2 md:col-span-2">
                        <Mail className="w-4 h-4 text-gray-500" />
                        <span>{formData.patient_email}</span>
                      </div>
                    </div>
                    {formData.motif && (
                      <div className="pt-2 border-t">
                        <p className="text-sm text-gray-600"><strong>Motif:</strong> {formData.motif}</p>
                      </div>
                    )}
                  </div>

                  {error && (
                    <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">
                      {error}
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="flex justify-between mt-6">
                <Button variant="outline" onClick={() => setStep(2)}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Retour
                </Button>
                <Button 
                  onClick={handleBooking} 
                  disabled={loading}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                  )}
                  Confirmer le rendez-vous
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}