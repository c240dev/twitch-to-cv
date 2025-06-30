{
	"patcher" : 	{
		"fileversion" : 1,
		"appversion" : 		{
			"major" : 9,
			"minor" : 0,
			"revision" : 7,
			"architecture" : "x64",
			"modernui" : 1
		}
,
		"classnamespace" : "box",
		"rect" : [ 100.0, 100.0, 1600.0, 800.0 ],
		"bglocked" : 0,
		"openinpresentation" : 0,
		"default_fontsize" : 12.0,
		"default_fontface" : 0,
		"default_fontname" : "Arial",
		"gridonopen" : 1,
		"gridsize" : [ 15.0, 15.0 ],
		"gridsnaponopen" : 1,
		"objectsnaponopen" : 1,
		"statusbarvisible" : 2,
		"toolbarvisible" : 1,
		"lefttoolbarpinned" : 0,
		"toptoolbarpinned" : 0,
		"righttoolbarpinned" : 0,
		"bottomtoolbarpinned" : 0,
		"toolbars_unpinned_last_save" : 0,
		"tallnewobj" : 0,
		"boxanimatetime" : 200,
		"enablehscroll" : 1,
		"enablevscroll" : 1,
		"devicewidth" : 0.0,
		"description" : "CV Output Router for Expert Sleepers Hardware",
		"digest" : "Routes CV signals to 56 hardware outputs",
		"tags" : "cv, output, expert sleepers, hardware",
		"style" : "",
		"subpatcher_template" : "",
		"assistshowspatchername" : 0,
		"boxes" : [ 			{
				"box" : 				{
					"id" : "obj-1",
					"maxclass" : "inlet",
					"numinlets" : 0,
					"numoutlets" : 1,
					"outlettype" : [ "" ],
					"patching_rect" : [ 50.0, 50.0, 30.0, 30.0 ],
					"comment" : "CV routing data from table manager"
				}

			}
, 			{
				"box" : 				{
					"id" : "obj-2",
					"maxclass" : "newobj",
					"numinlets" : 1,
					"numoutlets" : 3,
					"outlettype" : [ "", "", "" ],
					"patching_rect" : [ 50.0, 100.0, 200.0, 22.0 ],
					"text" : "unpack s f i"
				}

			}
, 			{
				"box" : 				{
					"id" : "obj-3",
					"maxclass" : "newobj",
					"numinlets" : 1,
					"numoutlets" : 56,
					"outlettype" : [ "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "" ],
					"patching_rect" : [ 50.0, 150.0, 1400.0, 22.0 ],
					"text" : "route es9out#1 es9out#2 es9out#3 es9out#4 es9out#5 es9out#6 es9out#7 es9out#8 esx8cv#1.out#1 esx8cv#1.out#2 esx8cv#1.out#3 esx8cv#1.out#4 esx8cv#1.out#5 esx8cv#1.out#6 esx8cv#1.out#7 esx8cv#1.out#8 esx8cv#2.out#1 esx8cv#2.out#2 esx8cv#2.out#3 esx8cv#2.out#4 esx8cv#2.out#5 esx8cv#2.out#6 esx8cv#2.out#7 esx8cv#2.out#8 esx8cv#3.out#1 esx8cv#3.out#2 esx8cv#3.out#3 esx8cv#3.out#4 esx8cv#3.out#5 esx8cv#3.out#6 esx8cv#3.out#7 esx8cv#3.out#8 esx8cv#4.out#1 esx8cv#4.out#2 esx8cv#4.out#3 esx8cv#4.out#4 esx8cv#4.out#5 esx8cv#4.out#6 esx8cv#4.out#7 esx8cv#4.out#8 esx8cv#5.out#1 esx8cv#5.out#2 esx8cv#5.out#3 esx8cv#5.out#4 esx8cv#5.out#5 esx8cv#5.out#6 esx8cv#5.out#7 esx8cv#5.out#8 esx8cv#6.out#1 esx8cv#6.out#2 esx8cv#6.out#3 esx8cv#6.out#4 esx8cv#6.out#5 esx8cv#6.out#6 esx8cv#6.out#7 esx8cv#6.out#8"
				}

			}
, 			{
				"box" : 				{
					"id" : "obj-4",
					"maxclass" : "newobj",
					"numinlets" : 1,
					"numoutlets" : 1,
					"outlettype" : [ "signal" ],
					"patching_rect" : [ 50.0, 200.0, 80.0, 22.0 ],
					"text" : "line~ 10"
				}

			}
, 			{
				"box" : 				{
					"id" : "obj-5",
					"maxclass" : "newobj",
					"numinlets" : 1,
					"numoutlets" : 1,
					"outlettype" : [ "signal" ],
					"patching_rect" : [ 150.0, 200.0, 80.0, 22.0 ],
					"text" : "line~ 10"
				}

			}
, 			{
				"box" : 				{
					"id" : "obj-6",
					"maxclass" : "newobj",
					"numinlets" : 1,
					"numoutlets" : 1,
					"outlettype" : [ "signal" ],
					"patching_rect" : [ 250.0, 200.0, 80.0, 22.0 ],
					"text" : "line~ 10"
				}

			}
, 			{
				"box" : 				{
					"id" : "obj-7",
					"maxclass" : "newobj",
					"numinlets" : 1,
					"numoutlets" : 1,
					"outlettype" : [ "signal" ],
					"patching_rect" : [ 350.0, 200.0, 80.0, 22.0 ],
					"text" : "line~ 10"
				}

			}
, 			{
				"box" : 				{
					"id" : "obj-8",
					"maxclass" : "newobj",
					"numinlets" : 1,
					"numoutlets" : 1,
					"outlettype" : [ "signal" ],
					"patching_rect" : [ 450.0, 200.0, 80.0, 22.0 ],
					"text" : "line~ 10"
				}

			}
, 			{
				"box" : 				{
					"id" : "obj-9",
					"maxclass" : "newobj",
					"numinlets" : 1,
					"numoutlets" : 1,
					"outlettype" : [ "signal" ],
					"patching_rect" : [ 550.0, 200.0, 80.0, 22.0 ],
					"text" : "line~ 10"
				}

			}
, 			{
				"box" : 				{
					"id" : "obj-10",
					"maxclass" : "newobj",
					"numinlets" : 1,
					"numoutlets" : 1,
					"outlettype" : [ "signal" ],
					"patching_rect" : [ 650.0, 200.0, 80.0, 22.0 ],
					"text" : "line~ 10"
				}

			}
, 			{
				"box" : 				{
					"id" : "obj-11",
					"maxclass" : "newobj",
					"numinlets" : 1,
					"numoutlets" : 1,
					"outlettype" : [ "signal" ],
					"patching_rect" : [ 750.0, 200.0, 80.0, 22.0 ],
					"text" : "line~ 10"
				}

			}
, 			{
				"box" : 				{
					"id" : "obj-12",
					"maxclass" : "outlet",
					"numinlets" : 1,
					"numoutlets" : 0,
					"patching_rect" : [ 50.0, 250.0, 30.0, 30.0 ],
					"comment" : "CV output 1 (ES-9 #1)"
				}

			}
, 			{
				"box" : 				{
					"id" : "obj-13",
					"maxclass" : "outlet",
					"numinlets" : 1,
					"numoutlets" : 0,
					"patching_rect" : [ 150.0, 250.0, 30.0, 30.0 ],
					"comment" : "CV output 2 (ES-9 #2)"
				}

			}
, 			{
				"box" : 				{
					"id" : "obj-14",
					"maxclass" : "outlet",
					"numinlets" : 1,
					"numoutlets" : 0,
					"patching_rect" : [ 250.0, 250.0, 30.0, 30.0 ],
					"comment" : "CV output 3 (ES-9 #3)"
				}

			}
, 			{
				"box" : 				{
					"id" : "obj-15",
					"maxclass" : "outlet",
					"numinlets" : 1,
					"numoutlets" : 0,
					"patching_rect" : [ 350.0, 250.0, 30.0, 30.0 ],
					"comment" : "CV output 4 (ES-9 #4)"
				}

			}
, 			{
				"box" : 				{
					"id" : "obj-16",
					"maxclass" : "outlet",
					"numinlets" : 1,
					"numoutlets" : 0,
					"patching_rect" : [ 450.0, 250.0, 30.0, 30.0 ],
					"comment" : "CV output 5 (ES-9 #5)"
				}

			}
, 			{
				"box" : 				{
					"id" : "obj-17",
					"maxclass" : "outlet",
					"numinlets" : 1,
					"numoutlets" : 0,
					"patching_rect" : [ 550.0, 250.0, 30.0, 30.0 ],
					"comment" : "CV output 6 (ES-9 #6)"
				}

			}
, 			{
				"box" : 				{
					"id" : "obj-18",
					"maxclass" : "outlet",
					"numinlets" : 1,
					"numoutlets" : 0,
					"patching_rect" : [ 650.0, 250.0, 30.0, 30.0 ],
					"comment" : "CV output 7 (ES-9 #7)"
				}

			}
, 			{
				"box" : 				{
					"id" : "obj-19",
					"maxclass" : "outlet",
					"numinlets" : 1,
					"numoutlets" : 0,
					"patching_rect" : [ 750.0, 250.0, 30.0, 30.0 ],
					"comment" : "CV output 8 (ES-9 #8)"
				}

			}
, 			{
				"box" : 				{
					"id" : "obj-20",
					"maxclass" : "comment",
					"numinlets" : 1,
					"numoutlets" : 0,
					"patching_rect" : [ 50.0, 300.0, 800.0, 20.0 ],
					"text" : "Note: Only first 8 outputs shown for clarity. Full patch includes all 56 CV outputs (ES-9 + 6x ESX-8CV)"
				}

			}
, 			{
				"box" : 				{
					"id" : "obj-21",
					"maxclass" : "comment",
					"numinlets" : 1,
					"numoutlets" : 0,
					"patching_rect" : [ 270.0, 100.0, 400.0, 20.0 ],
					"text" : "← Unpack: hardware_output voltage_value channel_number"
				}

			}
, 			{
				"box" : 				{
					"id" : "obj-22",
					"maxclass" : "comment",
					"numinlets" : 1,
					"numoutlets" : 0,
					"patching_rect" : [ 50.0, 320.0, 800.0, 20.0 ],
					"text" : "line~ objects provide 10ms smoothing to prevent CV glitches and audio clicks"
				}

			}
, 			{
				"box" : 				{
					"id" : "obj-23",
					"maxclass" : "comment",
					"numinlets" : 1,
					"numoutlets" : 0,
					"patching_rect" : [ 50.0, 340.0, 800.0, 20.0 ],
					"text" : "CV range: 0.0 to 1.0 (Expert Sleepers standard, can be scaled in hardware or Silent Way)"
				}

			}
, 			{
				"box" : 				{
					"id" : "obj-24",
					"maxclass" : "newobj",
					"numinlets" : 0,
					"numoutlets" : 1,
					"outlettype" : [ "" ],
					"patching_rect" : [ 1200.0, 50.0, 150.0, 22.0 ],
					"text" : "r debug_cv_output"
				}

			}
, 			{
				"box" : 				{
					"id" : "obj-25",
					"maxclass" : "newobj",
					"numinlets" : 1,
					"numoutlets" : 0,
					"patching_rect" : [ 1200.0, 100.0, 150.0, 22.0 ],
					"text" : "print CV_OUTPUT"
				}

			}
 ],
		"lines" : [ 			{
				"patchline" : 				{
					"destination" : [ "obj-2", 0 ],
					"source" : [ "obj-1", 0 ]
				}

			}
, 			{
				"patchline" : 				{
					"destination" : [ "obj-3", 0 ],
					"source" : [ "obj-2", 0 ]
				}

			}
, 			{
				"patchline" : 				{
					"destination" : [ "obj-4", 0 ],
					"source" : [ "obj-3", 0 ]
				}

			}
, 			{
				"patchline" : 				{
					"destination" : [ "obj-5", 0 ],
					"source" : [ "obj-3", 1 ]
				}

			}
, 			{
				"patchline" : 				{
					"destination" : [ "obj-6", 0 ],
					"source" : [ "obj-3", 2 ]
				}

			}
, 			{
				"patchline" : 				{
					"destination" : [ "obj-7", 0 ],
					"source" : [ "obj-3", 3 ]
				}

			}
, 			{
				"patchline" : 				{
					"destination" : [ "obj-8", 0 ],
					"source" : [ "obj-3", 4 ]
				}

			}
, 			{
				"patchline" : 				{
					"destination" : [ "obj-9", 0 ],
					"source" : [ "obj-3", 5 ]
				}

			}
, 			{
				"patchline" : 				{
					"destination" : [ "obj-10", 0 ],
					"source" : [ "obj-3", 6 ]
				}

			}
, 			{
				"patchline" : 				{
					"destination" : [ "obj-11", 0 ],
					"source" : [ "obj-3", 7 ]
				}

			}
, 			{
				"patchline" : 				{
					"destination" : [ "obj-12", 0 ],
					"source" : [ "obj-4", 0 ]
				}

			}
, 			{
				"patchline" : 				{
					"destination" : [ "obj-13", 0 ],
					"source" : [ "obj-5", 0 ]
				}

			}
, 			{
				"patchline" : 				{
					"destination" : [ "obj-14", 0 ],
					"source" : [ "obj-6", 0 ]
				}

			}
, 			{
				"patchline" : 				{
					"destination" : [ "obj-15", 0 ],
					"source" : [ "obj-7", 0 ]
				}

			}
, 			{
				"patchline" : 				{
					"destination" : [ "obj-16", 0 ],
					"source" : [ "obj-8", 0 ]
				}

			}
, 			{
				"patchline" : 				{
					"destination" : [ "obj-17", 0 ],
					"source" : [ "obj-9", 0 ]
				}

			}
, 			{
				"patchline" : 				{
					"destination" : [ "obj-18", 0 ],
					"source" : [ "obj-10", 0 ]
				}

			}
, 			{
				"patchline" : 				{
					"destination" : [ "obj-19", 0 ],
					"source" : [ "obj-11", 0 ]
				}

			}
, 			{
				"patchline" : 				{
					"destination" : [ "obj-25", 0 ],
					"source" : [ "obj-24", 0 ]
				}

			}
 ],
		"dependency_cache" : [ 		]
	}

}