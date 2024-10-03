"use client"

import { useState, useEffect, useRef } from 'react'
import { CheckCircle, PauseCircle, PlayCircle, StopCircle } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"

interface Task {
  id: number
  name: string
  completedAt: Date
  duration: number
}

export default function PomodoroApp() {
  const [time, setTime] = useState(25 * 60)
  const [isActive, setIsActive] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [tasks, setTasks] = useState<Task[]>([])
  const [currentTask, setCurrentTask] = useState('')
  const [selectedDuration, setSelectedDuration] = useState('25')
  const [customDuration, setCustomDuration] = useState('')
  const [completedPomodoros, setCompletedPomodoros] = useState(0)
  const [totalTimeToday, setTotalTimeToday] = useState(0)
  const [showStopDialog, setShowStopDialog] = useState(false)
  const [notificationPermission, setNotificationPermission] = useState('default')
  const startTimeRef = useRef<number | null>(null)
  const lastUpdateTimeRef = useRef<number | null>(null)
  const animationFrameRef = useRef<number | null>(null)

  useEffect(() => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission)
    }
  }, [])

  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission()
      setNotificationPermission(permission)
    }
  }

  useEffect(() => {
    if (isActive && !isPaused) {
      const duration = selectedDuration === 'custom' ? parseInt(customDuration) : parseInt(selectedDuration)
      startTimeRef.current = Date.now() - ((duration * 60) - time) * 1000
      lastUpdateTimeRef.current = Date.now()

      const updateTimer = () => {
        const now = Date.now()
        const elapsed = now - (startTimeRef.current || now)
        const newTime = Math.max(0, duration * 60 - Math.floor(elapsed / 1000))

        if (newTime === 0) {
          setIsActive(false)
          setIsPaused(false)
          sendNotification("¡Tiempo completado!", "La tarea ha sido marcada como completada.")
          setCompletedPomodoros(prev => prev + 1)
          setTotalTimeToday(prev => prev + duration * 60)
          completeCurrentTask(duration * 60)
        } else {
          setTime(newTime)
          // setTotalTimeToday(prev => prev + (now - (lastUpdateTimeRef.current || now)) / 1000)
        }

        lastUpdateTimeRef.current = now

        if (isActive && !isPaused) {
          animationFrameRef.current = requestAnimationFrame(updateTimer)
        }
      }

      animationFrameRef.current = requestAnimationFrame(updateTimer)
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [isActive, isPaused, selectedDuration, customDuration])

  const toggleTimer = () => {
    if (isPaused || !isActive) {
      setIsActive(true)
      setIsPaused(false)
      const duration = selectedDuration === 'custom' ? parseInt(customDuration) : parseInt(selectedDuration)
      startTimeRef.current = Date.now() - ((duration * 60) - time) * 1000
    } else {
      setIsPaused(true)
    }
  }

  const stopTimer = () => {
    if (isActive || isPaused) {
      setShowStopDialog(true)
    }
  }

  const startSession = () => {
    if (notificationPermission === 'default') {
      requestNotificationPermission()
    }
    setIsActive(true)
    const duration = selectedDuration === 'custom' ? parseInt(customDuration) : parseInt(selectedDuration)
    setTime(duration * 60)
    startTimeRef.current = Date.now()
    lastUpdateTimeRef.current = Date.now()
  }

  const completeCurrentTask = (duration: number) => {
    setTasks([...tasks, {
      id: Date.now(),
      name: currentTask,
      completedAt: new Date(),
      duration: duration
    }])
    setCurrentTask('')
    startTimeRef.current = null
    lastUpdateTimeRef.current = null
  }

  const handleStopConfirmation = (confirm: boolean) => {
    setShowStopDialog(false)
    if (confirm) {
      const elapsedTime = Math.floor((Date.now() - (startTimeRef.current || Date.now())) / 1000)
      completeCurrentTask(elapsedTime)
      setIsActive(false)
      setIsPaused(false)
      const duration = selectedDuration === 'custom' ? parseInt(customDuration) : parseInt(selectedDuration)
      setTime(duration * 60)
    }
  }

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const sendNotification = (title: string, body: string) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body })
    }
  }

  return (
    <div className="min-h-screen bg-red-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
        <h1 className="text-3xl font-bold text-red-600 mb-6 text-center">Pomodoro Timer</h1>
        {!isActive && !isPaused ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="task" className="block text-sm font-medium text-gray-700">
                ¿Qué tarea vas a realizar?
              </label>
              <Textarea
                id="task"
                value={currentTask}
                onChange={(e) => setCurrentTask(e.target.value)}
                placeholder="Describe tu tarea aquí"
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="duration" className="block text-sm font-medium text-gray-700">
                Duración de la sesión (minutos)
              </label>
              <Select value={selectedDuration} onValueChange={setSelectedDuration}>
                <SelectTrigger id="duration">
                  <SelectValue placeholder="Selecciona la duración" />
                </SelectTrigger>
                <SelectContent>
                  {[5, 15, 25, 40, 60].map((duration) => (
                    <SelectItem key={duration} value={duration.toString()}>
                      {duration} minutos
                    </SelectItem>
                  ))}
                  <SelectItem value="custom">Tiempo personalizado</SelectItem>
                </SelectContent>
              </Select>
              {selectedDuration === 'custom' && (
                <Input
                  type="number"
                  placeholder="Ingrese los minutos"
                  value={customDuration}
                  onChange={(e) => setCustomDuration(e.target.value)}
                  min="1"
                  className="mt-2"
                />
              )}
            </div>
            <Button 
              onClick={startSession} 
              className="w-full" 
              disabled={!currentTask.trim() || (selectedDuration === 'custom' && !customDuration)}
            >
              Empezar Sesión
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-lg text-center text-gray-700">
              Ahora mismo se está realizando lo siguiente:
            </p>
            <p className="text-xl font-semibold text-center text-red-600">
              {currentTask}
            </p>
            <div className="text-6xl font-bold text-center mb-4 text-red-500">{formatTime(time)}</div>
            <Progress value={(selectedDuration === 'custom' ? parseInt(customDuration) * 60 - time : parseInt(selectedDuration) * 60 - time) / (selectedDuration === 'custom' ? parseInt(customDuration) * 60 : parseInt(selectedDuration) * 60) * 100} className="mb-4" />
            <div className="flex justify-center space-x-4">
              <Button onClick={toggleTimer} variant="outline" size="icon">
                {isActive && !isPaused ? <PauseCircle className="h-6 w-6" /> : <PlayCircle className="h-6 w-6" />}
              </Button>
              <Button onClick={stopTimer} variant="outline" size="icon">
                <StopCircle className="h-6 w-6" />
              </Button>
            </div>
          </div>
        )}
        <Tabs defaultValue="tasks" className="mt-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="tasks">Tareas Completadas</TabsTrigger>
            <TabsTrigger value="stats">Estadísticas</TabsTrigger>
          </TabsList>
          <TabsContent value="tasks">
            <div className="space-y-4">
              {tasks.length === 0 ? (
                <p className="text-center text-gray-500">No hay tareas completadas aún.</p>
              ) : (
                <ul className="space-y-2">
                  {tasks.map(task => (
                    <li key={task.id} className="bg-red-100 p-2 rounded">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">{task.name}</span>
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      </div>
                      <div className="text-sm text-gray-600">
                        <p>Completada: {task.completedAt.toLocaleString()}</p>
                        <p>Duración: {formatTime(task.duration)}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </TabsContent>
          <TabsContent value="stats">
            <div className="space-y-4">
              <p className="text-lg">Total Pomodoros Completed: <span className="font-bold text-red-600">{completedPomodoros}</span></p>
              <p className="text-lg">Total Tasks: <span className="font-bold text-red-600">{tasks.length}</span></p>
              <p className="text-lg">Total Time Today: <span className="font-bold text-red-600">{formatTime(totalTimeToday)}</span></p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
      <Dialog open={showStopDialog} onOpenChange={setShowStopDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Estás seguro de que quieres detener el temporizador?</DialogTitle>
            <DialogDescription>
              Si detienes el temporizador ahora, la tarea actual se marcará como completada con el tiempo transcurrido hasta el momento.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => handleStopConfirmation(false)}>No, continuar</Button>
            <Button onClick={() => handleStopConfirmation(true)}>Sí, detener</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}